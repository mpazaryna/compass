// Journey eval — runs a bearing end to end against a running instrument, with a
// model playing the conductor (what Claude Desktop would be) and a second model
// playing the client from a fixed fact sheet.
//
// This is NOT a unit test. It costs API calls and its output is a document to
// read, not an assertion to trust blindly. It exists because a bearing is
// content (ADR-003) and the only way to review content mechanically is to run
// it. Opt-in: `pnpm --filter @compass/mcp run eval:journey`.
//
// A model in a local harness does not breach ADR-001 — that constraint is "no
// model loop in the cloud", about the deployed Worker. Nothing here runs on it.
//
// This file owns the two things that cannot be unit tested — the Anthropic API
// and the instrument's endpoint. Everything deciding what a run records lives in
// `harness.ts` and is covered by `harness.test.ts`.
import Anthropic from '@anthropic-ai/sdk'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  auditPrompt,
  auditStages,
  CLIENT_DONE,
  describeEnding,
  readClientReply,
  readRpcBody,
  readToolResult,
  renderDocument,
  renderTranscript,
  runGuideTurn,
  textFrom,
  type Ending,
  type Entry,
  type ModelReply,
  type Turn,
} from './harness.ts'

const HERE = dirname(fileURLToPath(import.meta.url))
const BASE = process.env.COMPASS_MCP_URL ?? 'http://localhost:8787'
const BEARING = process.env.COMPASS_EVAL_BEARING ?? 'brand-builder'
// A general bearing must work for every persona. One that only works for one of
// them is tuned, not neutral — see bearings/AUTHORING.md.
const PERSONA = process.env.COMPASS_EVAL_PERSONA ?? 'sheri'
const MODEL = 'claude-opus-5'
// The auditor is the measuring instrument, not the subject, so it is separable:
// one model grading a transcript it produced is self-evaluation. Point this at a
// different model to remove that.
const AUDIT_MODEL = process.env.COMPASS_EVAL_AUDIT_MODEL ?? MODEL

// Headroom, not a target. Brand Builder's two stages close well inside this;
// the bound exists so a bearing that never ends cannot bill indefinitely.
const MAX_EXCHANGES = Number(process.env.COMPASS_EVAL_MAX_EXCHANGES ?? 24)
if (!Number.isInteger(MAX_EXCHANGES) || MAX_EXCHANGES < 1) {
  // Left unchecked this yields NaN, runs zero exchanges, and writes an
  // empty-transcript audit that reads like a result.
  throw new Error(
    `COMPASS_EVAL_MAX_EXCHANGES must be a positive integer, got "${process.env.COMPASS_EVAL_MAX_EXCHANGES}"`,
  )
}

const client = new Anthropic()

// --- the instrument, over real MCP -------------------------------------------

let rpcId = 0
async function rpc(method: string, params?: unknown): Promise<any> {
  const res = await fetch(`${BASE}/mcp`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: ++rpcId, method, params }),
  })
  return readRpcBody(method, res, await res.text())
}

async function callTool(name: string, input: unknown) {
  return readToolResult(await rpc('tools/call', { name, arguments: input }))
}

// --- the two models -----------------------------------------------------------

/**
 * The conductor: what Claude Desktop is when it connects. Real instructions,
 * real tools. Temperature is left at the API default — the guide is the subject
 * of the eval, and pinning it to 0 would test one deterministic path rather than
 * the sampled behaviour a bearing actually has to hold against.
 */
function conductor(instructions: string, tools: unknown[]) {
  return (history: Turn[]): Promise<ModelReply> =>
    client.messages.create({
      model: MODEL,
      max_tokens: 16000,
      system: instructions,
      tools: tools as Anthropic.ToolUnion[],
      messages: history as Anthropic.MessageParam[],
    })
}

/** The client: answers from the fact sheet, in their own words. */
async function clientTurn(persona: string, history: Turn[]): Promise<string> {
  const res = await client.messages.create({
    model: MODEL,
    max_tokens: 4000,
    system: [
      'You are role-playing the person described below, being guided through a business exercise by a consultant.',
      'Answer ONLY from the fact sheet below, in their voice. Never break character, never mention',
      'that you are an AI or that this is a test, and never answer a question the fact sheet does',
      'not cover — say you are not sure, the way they would.',
      'Answer what you are asked and stop. Do not volunteer the next answer, do not summarise your',
      'own answers, and do not write polished marketing language — they cannot.',
      'If you are asked to write something in your own words, write it plainly and imperfectly.',
      `When the consultant has said the work is finished and you have nothing further you want`,
      `from them, end your reply with ${CLIENT_DONE} on its own line. Say your goodbye if you want`,
      `one, but say it once — do not keep the exchange going out of politeness.`,
      '',
      persona,
    ].join('\n'),
    messages: history as Anthropic.MessageParam[],
  })
  return textFrom(res.content)
}

// --- run ----------------------------------------------------------------------

async function main() {
  try {
    await fetch(`${BASE}/`)
  } catch {
    console.error(`No instrument reachable at ${BASE}.`)
    console.error('Start one first:  pnpm --filter @compass/mcp run dev')
    process.exit(1)
  }

  const init = await rpc('initialize', { protocolVersion: '2025-06-18' })
  const instructions: string = init.instructions
  const { tools: mcpTools } = await rpc('tools/list')
  // MCP says `inputSchema`; the Messages API says `input_schema`. Same schema, different case.
  const tools = mcpTools.map((t: any) => ({
    name: t.name,
    description: t.description,
    input_schema: t.inputSchema,
  }))
  console.log(`instrument: ${init.serverInfo.name}  tools: ${tools.map((t: any) => t.name).join(', ')}`)

  // What the audit will be held against, from the instrument rather than from
  // this file — so a new bearing costs a folder and a bake, not a code change.
  const stages = auditStages(JSON.parse((await callTool('get_bearing', { bearing: BEARING })).text))
  console.log(`stages: ${stages.map((s) => s.id).join(' → ')}`)

  const persona = await readFile(join(HERE, `persona-${PERSONA}.md`), 'utf8')
  const send = conductor(instructions, tools)

  const conductorHistory: Turn[] = [
    { role: 'user', content: `I'd like to work through the ${BEARING} bearing.` },
  ]
  const clientHistory: Turn[] = []
  console.log(`persona: ${PERSONA}`)

  const entries: Entry[] = []
  let ending: Ending = 'max-exchanges-reached'
  let exchanges = 0

  for (let i = 1; i <= MAX_EXCHANGES; i++) {
    const turn = await runGuideTurn({ send, runTool: callTool, history: conductorHistory })

    // Tool traffic first, then what the guide said. Exact interleaving within a
    // turn is not preserved — what the audit needs is which stages were opened,
    // what their gates said, and everything the guide asked.
    for (const call of turn.calls) {
      console.log(`    · ${call.name}(${JSON.stringify(call.input)})${call.isError ? ' — error' : ''}`)
      entries.push({ kind: 'tool', ...call })
    }
    if (turn.toolRoundsExceeded) {
      ending = 'tool-rounds-exceeded'
      break
    }
    if (!turn.text) {
      ending = 'guide-fell-silent'
      break
    }

    exchanges = i
    console.log(`\n[${i}] guide: ${turn.text.slice(0, 160).replace(/\s+/g, ' ')}…`)
    entries.push({ kind: 'guide', text: turn.text })

    clientHistory.push({ role: 'user', content: turn.text })
    const reply = readClientReply(await clientTurn(persona, clientHistory))
    if (reply.text) {
      clientHistory.push({ role: 'assistant', content: reply.text })
      console.log(`[${i}] owner: ${reply.text.slice(0, 160).replace(/\s+/g, ' ')}…`)
      entries.push({ kind: 'owner', text: reply.text })
      conductorHistory.push({ role: 'user', content: reply.text })
    }
    if (reply.closed) {
      ending = 'journey-closed'
      break
    }
  }

  const transcript = renderTranscript(entries)
  const outcome = describeEnding(ending, exchanges)
  console.log(`\n${outcome}`)

  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const outDir = join(HERE, 'output')
  await mkdir(outDir, { recursive: true })
  const out = join(outDir, `${BEARING}-${PERSONA}-${stamp}.md`)
  const document = (audit?: string) =>
    renderDocument({
      bearing: BEARING,
      persona: PERSONA,
      instrument: BASE,
      model: MODEL,
      auditModel: AUDIT_MODEL,
      outcome,
      transcript,
      ...(audit !== undefined ? { audit } : {}),
    })

  // Write the transcript before auditing. A run is dozens of model calls and the
  // audit is one more that can fail; losing the journey to a failed audit is not
  // a trade worth making.
  await writeFile(out, document(), 'utf8')
  console.log(`transcript written: ${out}`)

  // The deliverable: what she would be left holding.
  //
  // No `temperature` — it is removed on this model family and returns a 400, so
  // run-to-run agreement cannot be bought with a sampling parameter. What makes
  // two audits comparable here is the fixed heading set below.
  const review = await client.messages.create({
    model: AUDIT_MODEL,
    max_tokens: 8000,
    system: auditPrompt({ stages, outcome }),
    messages: [{ role: 'user', content: transcript }],
  })
  const audit = textFrom(review.content)
  await writeFile(out, document(audit), 'utf8')

  console.log(`\n${'─'.repeat(60)}\n${audit}\n${'─'.repeat(60)}`)
  console.log(`\nwritten: ${out}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
