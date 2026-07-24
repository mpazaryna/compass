import { describe, it, expect, beforeAll } from 'vitest'

// The full connector handshake against a RUNNING Worker over real HTTP. Targets
// $COMPASS_MCP_URL, else a local `wrangler dev` on :8787. Skipped (not failed)
// when no server is reachable, so the E2E suite is opt-in on a live stack.
const BASE = process.env.COMPASS_MCP_URL ?? 'http://localhost:8787'

const post = (body: unknown): Promise<Response> =>
  fetch(`${BASE}/mcp`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })

let reachable = false
beforeAll(async () => {
  try {
    await fetch(`${BASE}/`, { method: 'GET' })
    reachable = true
  } catch {
    reachable = false
  }
})

describe('connector handshake over real HTTP', () => {
  it('completes initialize then notifications/initialized then tools/list then tools/call', async (ctx) => {
    if (!reachable) ctx.skip()

    const init = (await (
      await post({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18' } })
    ).json()) as any
    expect(init.result.serverInfo.name).toBe('compass')
    expect(init.result.instructions).toMatch(/bearing/i)

    const ack = await post({ jsonrpc: '2.0', method: 'notifications/initialized' })
    expect(ack.status).toBe(202)

    const tools = (await (await post({ jsonrpc: '2.0', id: 2, method: 'tools/list' })).json()) as any
    expect(tools.result.tools.map((t: { name: string }) => t.name)).toContain('get_stage')

    const call = (await (
      await post({
        jsonrpc: '2.0',
        id: 3,
        method: 'tools/call',
        params: { name: 'get_stage', arguments: { bearing: 'brand-builder', stage: 'discovery' } },
      })
    ).json()) as any
    expect(JSON.parse(call.result.content[0].text).id).toBe('discovery')
  })
})
