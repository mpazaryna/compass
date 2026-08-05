import { describe, it, expect } from 'vitest'
import {
  auditPrompt,
  auditStages,
  CLIENT_DONE,
  describeEnding,
  isText,
  readClientReply,
  readRpcBody,
  readToolResult,
  renderDocument,
  renderTranscript,
  runGuideTurn,
  textFrom,
  type Entry,
  type ModelReply,
  type ToolOutcome,
  type Turn,
} from './harness.ts'

const text = (t: string) => ({ type: 'text' as const, text: t })
const use = (id: string, name: string, input: unknown) => ({
  type: 'tool_use' as const,
  id,
  name,
  input,
})

/** A `send` that replays a fixed script of replies, recording what it was asked. */
function scripted(replies: ModelReply[]) {
  const seen: Turn[][] = []
  let i = 0
  return {
    seen,
    send: async (history: Turn[]) => {
      seen.push(history.map((t) => ({ ...t })))
      const reply = replies[i++]
      if (!reply) throw new Error('scripted send: ran out of replies')
      return reply
    },
  }
}

const okTool = async (): Promise<ToolOutcome> => ({ text: 'tool said this', isError: false })

describe('textFrom', () => {
  it('joins every text block in a reply', () => {
    expect(textFrom([text('one'), use('u1', 'get_stage', {}), text('two')])).toBe('one\n\ntwo')
  })

  it('is empty when a reply carries no text', () => {
    expect(textFrom([use('u1', 'get_stage', {})])).toBe('')
  })

  it('ignores block types it does not know', () => {
    expect(textFrom([{ type: 'thinking' }, text('said')])).toBe('said')
  })
})

describe('isText', () => {
  it('narrows text blocks only', () => {
    expect([text('a'), use('u1', 't', {})].filter(isText)).toHaveLength(1)
  })
})

describe('runGuideTurn', () => {
  it('keeps guide text that arrives in the same turn as a tool call', async () => {
    const { send } = scripted([
      { content: [text('Let me open that.'), use('u1', 'get_stage', { stage: 'discovery' })] },
      { content: [text('Layer 1: what work are you known for?')] },
    ])

    const turn = await runGuideTurn({ send, runTool: okTool, history: [] })

    // The old harness returned only the final turn's text, silently dropping
    // everything the guide said while calling a tool.
    expect(turn.text).toBe('Let me open that.\n\nLayer 1: what work are you known for?')
  })

  it('records every tool call with its arguments and result', async () => {
    const { send } = scripted([
      { content: [use('u1', 'list_bearings', {})] },
      { content: [use('u2', 'get_stage', { bearing: 'brand-builder', stage: 'discovery' })] },
      { content: [text('done')] },
    ])

    const turn = await runGuideTurn({ send, runTool: okTool, history: [] })

    expect(turn.calls).toEqual([
      { name: 'list_bearings', input: {}, text: 'tool said this', isError: false },
      {
        name: 'get_stage',
        input: { bearing: 'brand-builder', stage: 'discovery' },
        text: 'tool said this',
        isError: false,
      },
    ])
  })

  it('flags a tool call the instrument reported as an error', async () => {
    const { send } = scripted([
      { content: [use('u1', 'get_stage', { stage: 'nope' })] },
      { content: [text('sorry')] },
    ])
    const runTool = async (): Promise<ToolOutcome> => ({
      text: 'journey "brand-builder" has no stage "nope"',
      isError: true,
    })

    const turn = await runGuideTurn({ send, runTool, history: [] })

    expect(turn.calls[0]!.isError).toBe(true)
  })

  it('marks an errored tool result as such for the model', async () => {
    const { send, seen } = scripted([
      { content: [use('u1', 'get_stage', {})] },
      { content: [text('sorry')] },
    ])
    const runTool = async (): Promise<ToolOutcome> => ({ text: 'no such stage', isError: true })

    await runGuideTurn({ send, runTool, history: [] })

    const results = seen[1]!.at(-1)!.content as { is_error?: true }[]
    expect(results[0]!.is_error).toBe(true)
  })

  it('services a tool call even when the turn ended on max_tokens', async () => {
    // Driving off stop_reason left the tool_use unanswered, and the next request
    // failed with "tool_use ids were found without tool_result blocks".
    const { send } = scripted([
      { content: [use('u1', 'get_stage', {})], stop_reason: 'max_tokens' },
      { content: [text('carrying on')] },
    ])

    const turn = await runGuideTurn({ send, runTool: okTool, history: [] })

    expect(turn.calls).toHaveLength(1)
    expect(turn.toolRoundsExceeded).toBe(false)
  })

  it('stops and reports when a guide will not stop calling tools', async () => {
    const forever: ModelReply = { content: [use('u1', 'list_bearings', {})] }
    const { send } = scripted(Array.from({ length: 10 }, () => forever))

    const turn = await runGuideTurn({ send, runTool: okTool, history: [], maxToolRounds: 3 })

    expect(turn.toolRoundsExceeded).toBe(true)
    expect(turn.calls).toHaveLength(3)
  })
})

describe('renderTranscript', () => {
  const entries: Entry[] = [
    { kind: 'guide', text: 'What work are you known for?' },
    { kind: 'owner', text: 'Colour correction.' },
    {
      kind: 'tool',
      name: 'get_stage',
      input: { stage: 'foundation' },
      text: '{"gate":{"rule":"all three questions"}}',
      isError: false,
    },
  ]

  it('renders guide, owner, and tool traffic in the order it happened', () => {
    const out = renderTranscript(entries)
    expect(out.indexOf('### Guide')).toBeLessThan(out.indexOf('### Owner'))
    expect(out.indexOf('### Owner')).toBeLessThan(out.indexOf('### Tool'))
  })

  it('records the tool call, its arguments, and what came back', () => {
    // The audit is asked which stages were opened and what their gates said.
    // That evidence only exists in the tool traffic.
    const out = renderTranscript(entries)
    expect(out).toContain('get_stage')
    expect(out).toContain('"stage": "foundation"')
    expect(out).toContain('all three questions')
  })

  it('marks an errored call so the audit cannot read it as a clean run', () => {
    const out = renderTranscript([
      { kind: 'tool', name: 'get_stage', input: {}, text: 'no such stage', isError: true },
    ])
    expect(out).toMatch(/### Tool .*error/i)
  })
})

describe('auditStages', () => {
  const bearing = {
    bearing: 'life-cycle',
    profile: 'journey',
    stages: [
      {
        id: 'placement',
        title: 'Where You Are Now',
        artifact: 'Placement and the fork, decided',
        gate: { rule: 'the stage is named and the fork is decided with reasons', requires_signoff: true },
      },
    ],
  }

  it('reads each stage’s artifact and gate rule from the served bearing', () => {
    expect(auditStages(bearing)).toEqual([
      {
        id: 'placement',
        title: 'Where You Are Now',
        artifact: 'Placement and the fork, decided',
        rule: 'the stage is named and the fork is decided with reasons',
      },
    ])
  })

  it('rejects a bearing with no stages, naming what it got', () => {
    expect(() => auditStages({ bearing: 'x', profile: 'standing' })).toThrowError(
      /"x" is a standing bearing — the journey eval needs stages/,
    )
  })
})

describe('auditPrompt', () => {
  const stages = [
    { id: 'discovery', title: 'Discovery', artifact: 'Discovery synthesis', rule: 'all four layers answered' },
    { id: 'foundation', title: 'Foundation', artifact: 'Foundation statement', rule: 'all three questions answered' },
  ]
  const prompt = () => auditPrompt({ stages, outcome: 'Ended after 12 exchanges: closed.' })

  it('names every artifact the bearing declares', () => {
    expect(prompt()).toContain('Discovery synthesis')
    expect(prompt()).toContain('Foundation statement')
  })

  it('quotes every gate rule, so the audit checks the served text', () => {
    expect(prompt()).toContain('all four layers answered')
    expect(prompt()).toContain('all three questions answered')
  })

  it('tells the auditor how the run ended', () => {
    expect(prompt()).toContain('Ended after 12 exchanges')
  })

  it('carries no artifact the bearing did not declare', () => {
    // The audit used to hardcode Brand Builder's "foundation statement", which
    // is nonsense pointed at any other bearing.
    const other = auditPrompt({
      stages: [{ id: 'p', title: 'P', artifact: 'Placement and the fork', rule: 'the fork is decided' }],
      outcome: 'Ended after 4 exchanges: closed.',
    })
    expect(other).not.toMatch(/foundation statement/i)
    expect(other).toContain('Placement and the fork')
  })
})

describe('readClientReply', () => {
  it('passes an ordinary answer through unchanged', () => {
    expect(readClientReply('Colour correction, mostly.')).toEqual({
      closed: false,
      text: 'Colour correction, mostly.',
    })
  })

  it('closes the journey when the client signals it is done', () => {
    expect(readClientReply(CLIENT_DONE)).toEqual({ closed: true, text: '' })
  })

  it('keeps what they said alongside the signal', () => {
    // Nothing ends a run otherwise: the guide stops coaching but keeps replying,
    // and the two of them trade goodbyes until the exchange budget is gone.
    expect(readClientReply(`Thanks for this.\n${CLIENT_DONE}`)).toEqual({
      closed: true,
      text: 'Thanks for this.',
    })
  })
})

describe('describeEnding', () => {
  it('does not call a completed journey unfinished', () => {
    const closed = describeEnding('journey-closed', 18)
    expect(closed).toMatch(/18 exchanges/)
    expect(closed).not.toMatch(/unfinished/)
  })

  it('still warns when the exchange limit cut a run short', () => {
    expect(describeEnding('max-exchanges-reached', 24)).toMatch(/unfinished/)
  })
})

describe('renderDocument', () => {
  const base = {
    bearing: 'brand-builder',
    persona: 'sheri',
    instrument: 'http://localhost:8787',
    model: 'claude-opus-5',
    auditModel: 'claude-opus-5',
    outcome: 'Ended after 12 exchanges: the guide returned an empty turn.',
    transcript: '### Guide\n\nWhat work are you known for?',
  }

  it('records what was run, how it ended, and the transcript', () => {
    const out = renderDocument(base)
    expect(out).toContain('brand-builder')
    expect(out).toContain('Ended after 12 exchanges')
    expect(out).toContain('What work are you known for?')
  })

  it('writes a usable document when the audit has not run yet', () => {
    // The transcript is the expensive part of a run. It must survive an audit
    // that fails — two full journeys were lost to exactly that.
    const out = renderDocument(base)
    expect(out).toMatch(/## Audit\n\n_not run/)
    expect(out).toContain('### Guide')
  })

  it('includes the audit once it exists', () => {
    const out = renderDocument({ ...base, audit: '## Gates\n\nDiscovery: met.' })
    expect(out).toContain('Discovery: met.')
    expect(out).not.toMatch(/_not run/)
  })
})

describe('readRpcBody', () => {
  const res = (status: number, statusText = '') => ({ ok: status < 400, status, statusText })

  it('returns the result of a well-formed response', () => {
    expect(readRpcBody('tools/list', res(200), '{"jsonrpc":"2.0","id":1,"result":{"tools":[]}}')).toEqual({
      tools: [],
    })
  })

  it('names the status and the method when the instrument returns an HTTP error', () => {
    // Auth lands on this endpoint in M4; a 401 must not surface as a JSON error.
    expect(() => readRpcBody('initialize', res(401, 'Unauthorized'), 'unauthorized')).toThrowError(
      /initialize.*HTTP 401 Unauthorized.*unauthorized/s,
    )
  })

  it('says plainly when a 200 response is not JSON', () => {
    expect(() => readRpcBody('tools/list', res(200), '<!DOCTYPE html><html>')).toThrowError(
      /tools\/list.*not JSON.*DOCTYPE/s,
    )
  })

  it('surfaces a JSON-RPC error message', () => {
    expect(() =>
      readRpcBody('tools/call', res(200), '{"jsonrpc":"2.0","id":1,"error":{"code":-32601,"message":"method not found: nope"}}'),
    ).toThrowError(/tools\/call: method not found: nope/)
  })
})

describe('readToolResult', () => {
  it('joins the text content of a successful call', () => {
    expect(readToolResult({ content: [{ type: 'text', text: 'a' }, { type: 'text', text: 'b' }] })).toEqual({
      text: 'a\nb',
      isError: false,
    })
  })

  it('carries the instrument’s isError through', () => {
    expect(readToolResult({ content: [{ type: 'text', text: 'no bearing' }], isError: true })).toEqual({
      text: 'no bearing',
      isError: true,
    })
  })

  it('rejects a result with no content array, naming what it got', () => {
    expect(() => readToolResult({ nope: true })).toThrowError(
      /tool result has no "content" array/,
    )
  })
})
