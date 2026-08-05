// The pure layer of the journey eval: everything that decides what a run
// records, separated from the two things that cannot be unit tested — the
// Anthropic API and the instrument's HTTP endpoint. `journey.ts` supplies both
// as functions and this module holds the logic, so the fidelity of a transcript
// is covered by ordinary tests rather than by re-reading an eval's output.
//
// Fidelity is the whole point. An audit is only as good as the transcript it
// reads, and every function here exists because the first version of this
// harness quietly dropped evidence the auditor was then asked to report on.

export interface ReplyBlock {
  readonly type: string
}
export interface TextBlock extends ReplyBlock {
  readonly type: 'text'
  readonly text: string
}
export interface ToolUseBlock extends ReplyBlock {
  readonly type: 'tool_use'
  readonly id: string
  readonly name: string
  readonly input: unknown
}

export const isText = (b: ReplyBlock): b is TextBlock => b.type === 'text'
export const isToolUse = (b: ReplyBlock): b is ToolUseBlock => b.type === 'tool_use'

export interface ModelReply {
  readonly content: readonly ReplyBlock[]
  readonly stop_reason?: string | null
}

export type Turn = { role: 'assistant' | 'user'; content: unknown }

export interface ToolOutcome {
  text: string
  isError: boolean
}

export interface ToolCallRecord {
  name: string
  input: unknown
  text: string
  isError: boolean
}

export interface GuideTurn {
  /** Everything the guide said this turn, including text alongside a tool call. */
  text: string
  calls: ToolCallRecord[]
  toolRoundsExceeded: boolean
}

/** A guide can legitimately chain a few calls (list → get_bearing → get_stage). */
const DEFAULT_MAX_TOOL_ROUNDS = 12

/** Every text block in a reply, in order. */
export function textFrom(blocks: readonly ReplyBlock[]): string {
  return blocks
    .filter(isText)
    .map((b) => b.text.trim())
    .filter((t) => t.length > 0)
    .join('\n\n')
}

/**
 * One guide turn: send, service any tool calls, repeat until the guide replies
 * without calling a tool. Returns everything it said and every call it made.
 *
 * Driven by the presence of `tool_use` blocks rather than by `stop_reason`. A
 * turn that ends on `max_tokens` mid-call still has a block needing an answer,
 * and leaving it unanswered fails the next request outright.
 */
export async function runGuideTurn(opts: {
  send: (history: Turn[]) => Promise<ModelReply>
  runTool: (name: string, input: unknown) => Promise<ToolOutcome>
  history: Turn[]
  maxToolRounds?: number
}): Promise<GuideTurn> {
  const { send, runTool, history } = opts
  const maxToolRounds = opts.maxToolRounds ?? DEFAULT_MAX_TOOL_ROUNDS

  const said: string[] = []
  const calls: ToolCallRecord[] = []

  for (let round = 0; ; round++) {
    const reply = await send(history)
    history.push({ role: 'assistant', content: reply.content })

    const text = textFrom(reply.content)
    if (text) said.push(text)

    const uses = reply.content.filter(isToolUse)
    if (uses.length === 0) {
      return { text: said.join('\n\n'), calls, toolRoundsExceeded: false }
    }
    // A guide that will not stop calling tools bills indefinitely. Stop, and say
    // so — an eval that ended this way has not run the journey.
    if (round >= maxToolRounds) {
      return { text: said.join('\n\n'), calls, toolRoundsExceeded: true }
    }

    const results = []
    for (const call of uses) {
      let outcome: ToolOutcome
      try {
        outcome = await runTool(call.name, call.input)
      } catch (err) {
        outcome = { text: `Error: ${(err as Error).message}`, isError: true }
      }
      calls.push({ name: call.name, input: call.input, text: outcome.text, isError: outcome.isError })
      results.push({
        type: 'tool_result',
        tool_use_id: call.id,
        content: outcome.text,
        // `is_error` is how the model learns a call failed. Without it a failure
        // reads as ordinary content and the guide improvises over it.
        ...(outcome.isError ? { is_error: true as const } : {}),
      })
    }
    history.push({ role: 'user', content: results })
  }
}

export type Entry =
  | { kind: 'guide'; text: string }
  | { kind: 'owner'; text: string }
  | { kind: 'tool'; name: string; input: unknown; text: string; isError: boolean }

/**
 * The transcript the auditor reads. Tool traffic is included because the audit
 * is asked which stages were opened and what their gates said — evidence that
 * exists nowhere else. Without it that section is inferred, which for a gate is
 * the one thing an audit must not do.
 */
export function renderTranscript(entries: readonly Entry[]): string {
  return entries
    .map((e) => {
      if (e.kind === 'guide') return `### Guide\n\n${e.text}`
      if (e.kind === 'owner') return `### Owner\n\n${e.text}`
      const heading = e.isError ? `### Tool \`${e.name}\` — error` : `### Tool \`${e.name}\``
      return `${heading}\n\nCalled with:\n\n\`\`\`json\n${JSON.stringify(e.input, null, 2)}\n\`\`\`\n\nReturned:\n\n\`\`\`\n${e.text}\n\`\`\``
    })
    .join('\n\n')
}

export interface AuditStage {
  id: string
  title: string
  artifact: string
  rule: string
}

/**
 * The stages an audit checks, read from the bearing the instrument served rather
 * than written into this file. A bearing declares its own artifacts and gate
 * rules; an audit that names them from anywhere else is checking a different
 * bearing than the one that ran.
 */
export function auditStages(bearing: unknown): AuditStage[] {
  const b = bearing as { bearing?: string; profile?: string; stages?: unknown }
  if (!Array.isArray(b.stages) || b.stages.length === 0) {
    throw new Error(
      `"${b.bearing}" is a ${b.profile} bearing — the journey eval needs stages to audit against`,
    )
  }
  return b.stages.map((s: { id: string; title: string; artifact: string; gate?: { rule: string } }) => ({
    id: s.id,
    title: s.title,
    artifact: s.artifact,
    rule: s.gate?.rule ?? '(no gate rule declared)',
  }))
}

/**
 * The auditor's brief. The bearing-specific parts — which artifacts to look for,
 * which gate rules to hold the transcript against — come from the served
 * envelope; only the invariants every bearing must hold are written here.
 */
export function auditPrompt(opts: { stages: readonly AuditStage[]; outcome: string }): string {
  const artifacts = opts.stages.map((s) => `- ${s.title} (\`${s.id}\`) produces: ${s.artifact}`)
  const gates = opts.stages.map((s) => `- ${s.title} (\`${s.id}\`) gate: "${s.rule}"`)

  return [
    'You are auditing a transcript of a guided exercise. Report only what the',
    'transcript shows. Do not improve, complete, or invent any artifact.',
    'The transcript includes the tool calls the guide made and what came back.',
    '',
    'The bearing declares these artifacts:',
    ...artifacts,
    '',
    'and these gates:',
    ...gates,
    '',
    'Answer in markdown under these exact headings:',
    '## Artifacts produced — for each artifact above, quote it verbatim from the',
    'transcript, or write "not produced".',
    '## Gates — for each stage the guide opened, quote its gate rule and state',
    'whether the transcript shows it actually met, with the evidence.',
    '## One question at a time — did the guide ask a single question per turn?',
    'Quote any turn that asked more than one.',
    '## Who drafted — for each artifact that is the person\'s own words, did THEY',
    'write it or did the GUIDE write it for them? Quote the moment it first appears.',
    '## What broke — anything the bearing should have prevented and did not.',
    '## Domain fit — did the guide ever assume a trade, industry, or workplace the',
    'person did not name, or reach for an example from a field they never mentioned?',
    'Quote it.',
    '',
    `How the run ended: ${opts.outcome}`,
    'If the run was cut short, say so under "What broke" and do not report an',
    'unreached stage as a failure of the bearing.',
  ].join('\n')
}

/**
 * The token the client uses to end a run. Nothing else can: Compass never ends a
 * session — under ADR-001 the client carries the loop — and the two models will
 * trade goodbyes until the exchange budget is gone. The guide correctly stops
 * *coaching* once the bearing closes; only the person can stop *replying*.
 */
export const CLIENT_DONE = '<<done>>'

/** Split a client turn into what they said and whether they are finished. */
export function readClientReply(raw: string): { closed: boolean; text: string } {
  const closed = raw.includes(CLIENT_DONE)
  return { closed, text: raw.split(CLIENT_DONE).join('').trim() }
}

/**
 * Why a run stopped. A truncated run must not read like a finished one — and an
 * ending may only claim what the transcript shows. `client-ended` says the
 * client stopped, not that the bearing was closed: one run ended on an unapplied
 * correction under a label asserting a closing that never happened.
 */
export type Ending =
  | 'client-ended'
  | 'guide-fell-silent'
  | 'max-exchanges-reached'
  | 'tool-rounds-exceeded'

export function describeEnding(ending: Ending, exchanges: number): string {
  const detail: Record<Ending, string> = {
    'client-ended': 'the client ended the exchange',
    'guide-fell-silent': 'the guide returned an empty turn',
    'max-exchanges-reached': 'the exchange limit was reached — the journey may be unfinished',
    'tool-rounds-exceeded': 'the guide would not stop calling tools — the journey did not run',
  }
  return `Ended after ${exchanges} exchange${exchanges === 1 ? '' : 's'}: ${detail[ending]}.`
}

/**
 * The run document. Written once with the transcript alone and again with the
 * audit, so a failed audit costs an audit rather than the whole journey — a run
 * is dozens of model calls and the transcript is the part that cannot be redone.
 */
export function renderDocument(run: {
  bearing: string
  persona: string
  instrument: string
  model: string
  auditModel: string
  outcome: string
  transcript: string
  usage?: string
  audit?: string
}): string {
  return [
    `# Journey eval — ${run.bearing} (persona: ${run.persona})`,
    ``,
    `Instrument: ${run.instrument} · conductor & client: ${run.model} · auditor: ${run.auditModel}`,
    ...(run.usage ? [``, `Tokens: ${run.usage}`] : []),
    ``,
    run.outcome,
    ``,
    `## Audit`,
    ``,
    run.audit ?? '_not run — see the transcript below._',
    ``,
    `## Transcript`,
    ``,
    run.transcript,
    ``,
  ].join('\n')
}

const snippet = (raw: string) => {
  const flat = raw.trim().replace(/\s+/g, ' ')
  return flat.length > 200 ? `${flat.slice(0, 200)}…` : flat
}

/**
 * Read one JSON-RPC response. Every failure names the method and what actually
 * came back: an unauthenticated or misrouted instrument used to surface as an
 * opaque JSON parse error, which is the wrong thing to debug.
 */
export function readRpcBody(
  method: string,
  res: { ok: boolean; status: number; statusText: string },
  raw: string,
): unknown {
  if (!res.ok) {
    const status = `HTTP ${res.status}${res.statusText ? ` ${res.statusText}` : ''}`
    throw new Error(`${method}: instrument returned ${status} — ${snippet(raw)}`)
  }

  let body: { error?: { message?: string }; result?: unknown }
  try {
    body = JSON.parse(raw)
  } catch {
    throw new Error(
      `${method}: instrument returned a response that is not JSON (HTTP ${res.status}) — ${snippet(raw)}`,
    )
  }

  if (body.error) throw new Error(`${method}: ${body.error.message ?? 'unknown JSON-RPC error'}`)
  return body.result
}

/** Read a tools/call result, keeping the instrument's own error flag. */
export function readToolResult(result: unknown): ToolOutcome {
  const content = (result as { content?: unknown } | null)?.content
  if (!Array.isArray(content)) {
    throw new Error(`tool result has no "content" array — got ${JSON.stringify(result)}`)
  }
  const text = content
    .map((c: { text?: unknown }) => (typeof c.text === 'string' ? c.text : ''))
    .join('\n')
  return { text, isError: (result as { isError?: boolean }).isError === true }
}
