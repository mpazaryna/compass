// Journey eval — runs a bearing end to end against the deployed instrument,
// with a model playing the conductor (what Claude Desktop would be) and a
// second model playing the client from a fixed fact sheet.
//
// This is NOT a unit test. It costs API calls and its output is a document to
// read, not an assertion to trust blindly. It exists because a bearing is
// content (ADR-003) and the only way to review content mechanically is to run
// it. Opt-in: `pnpm --filter @compass/mcp run eval:journey`.
//
// A model in a local harness does not breach ADR-001 — that constraint is "no
// model loop in the cloud", about the deployed Worker. Nothing here runs on it.
import Anthropic from '@anthropic-ai/sdk'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const BASE = process.env.COMPASS_MCP_URL ?? 'http://localhost:8787'
const BEARING = process.env.COMPASS_EVAL_BEARING ?? 'brand-builder'
// A general bearing must work for every persona. One that only works for one of
// them is tuned, not neutral — see bearings/AUTHORING.md.
const PERSONA = process.env.COMPASS_EVAL_PERSONA ?? 'sheri'
const MODEL = 'claude-opus-5'
const MAX_EXCHANGES = Number(process.env.COMPASS_EVAL_MAX_EXCHANGES ?? 16)

const client = new Anthropic()

// --- the instrument, over real MCP -------------------------------------------

let rpcId = 0
async function rpc(method: string, params?: unknown): Promise<any> {
  const res = await fetch(`${BASE}/mcp`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: ++rpcId, method, params }),
  })
  const body = (await res.json()) as any
  if (body.error) throw new Error(`${method}: ${body.error.message}`)
  return body.result
}

async function callTool(name: string, args: Record<string, unknown>): Promise<string> {
  const result = await rpc('tools/call', { name, arguments: args })
  return result.content.map((c: { text: string }) => c.text).join('\n')
}

// --- the two models -----------------------------------------------------------

type Turn = { role: 'assistant' | 'user'; content: any }

/** The conductor: what Claude Desktop is when it connects. Real instructions, real tools. */
async function conductorTurn(instructions: string, tools: any[], history: Turn[]): Promise<string> {
  for (;;) {
    const res = await client.messages.create({
      model: MODEL,
      max_tokens: 16000,
      system: instructions,
      tools,
      messages: history as any,
    })
    history.push({ role: 'assistant', content: res.content })

    if (res.stop_reason !== 'tool_use') {
      return res.content
        .filter((b): b is Anthropic.TextBlock => b.type === 'text')
        .map((b) => b.text)
        .join('\n')
        .trim()
    }

    const results = []
    for (const block of res.content) {
      if (block.type !== 'tool_use') continue
      let text: string
      try {
        text = await callTool(block.name, block.input as Record<string, unknown>)
      } catch (err) {
        text = `Error: ${(err as Error).message}`
      }
      console.log(`    · ${block.name}(${JSON.stringify(block.input)})`)
      results.push({ type: 'tool_result', tool_use_id: block.id, content: text })
    }
    history.push({ role: 'user', content: results })
  }
}

/** The client: answers from the fact sheet, in her own words. */
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
      '',
      persona,
    ].join('\n'),
    messages: history as any,
  })
  return res.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('\n')
    .trim()
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

  const persona = await readFile(join(HERE, `persona-${PERSONA}.md`), 'utf8')

  const conductorHistory: Turn[] = [
    { role: 'user', content: `I'd like to work through the ${BEARING} bearing.` },
  ]
  const clientHistory: Turn[] = []
  console.log(`persona: ${PERSONA}`)
  const transcript: string[] = []

  for (let i = 1; i <= MAX_EXCHANGES; i++) {
    const guide = await conductorTurn(instructions, tools, conductorHistory)
    if (!guide) break
    console.log(`\n[${i}] guide: ${guide.slice(0, 160).replace(/\s+/g, ' ')}…`)
    transcript.push(`### Guide\n\n${guide}`)

    clientHistory.push({ role: 'user', content: guide })
    const owner = await clientTurn(persona, clientHistory)
    clientHistory.push({ role: 'assistant', content: owner })
    console.log(`[${i}] owner: ${owner.slice(0, 160).replace(/\s+/g, ' ')}…`)
    transcript.push(`### Owner\n\n${owner}`)

    conductorHistory.push({ role: 'user', content: owner })
  }

  // The deliverable: what she would be left holding.
  const review = await client.messages.create({
    model: MODEL,
    max_tokens: 8000,
    system: [
      'You are auditing a transcript of a guided business exercise. Report only what the',
      'transcript shows. Do not improve, complete, or invent any artifact.',
      'Answer in markdown under these exact headings:',
      '## Artifacts produced — quote each one verbatim, or write "not produced".',
      '## Gates — for each stage the guide opened, state its gate and whether the transcript',
      'shows it actually met, with the evidence.',
      '## One question at a time — did the guide ask a single question per turn? Quote any turn',
      'that asked more than one.',
      '## Who drafted — did the OWNER write the foundation statement, or did the GUIDE write it',
      'for her? Quote the moment it first appears.',
      '## What broke — anything the bearing should have prevented and did not.',
      '## Domain fit — did the guide ever assume a trade, industry, or workplace the person',
      'did not name, or reach for an example from a field they never mentioned? Quote it.',
    ].join('\n'),
    messages: [{ role: 'user', content: transcript.join('\n\n') }],
  })
  const audit = review.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('\n')

  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const outDir = join(HERE, 'output')
  await mkdir(outDir, { recursive: true })
  const out = join(outDir, `${BEARING}-${PERSONA}-${stamp}.md`)
  await writeFile(
    out,
    [
      `# Journey eval — ${BEARING} (persona: ${PERSONA})`,
      ``,
      `Instrument: ${BASE} · conductor & client: ${MODEL}`,
      ``,
      `## Audit`,
      ``,
      audit,
      ``,
      `## Transcript`,
      ``,
      transcript.join('\n\n'),
      ``,
    ].join('\n'),
    'utf8',
  )

  console.log(`\n${'─'.repeat(60)}\n${audit}\n${'─'.repeat(60)}`)
  console.log(`\nwritten: ${out}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
