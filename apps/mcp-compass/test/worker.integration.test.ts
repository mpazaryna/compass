import { describe, it, expect } from 'vitest'
import worker from '../src/index.ts'

// The real fetch handler, exercised with real Request/Response (no mocks at the
// seam). The workerd runtime itself is covered by the E2E tier.
const post = (body: unknown): Promise<Response> =>
  worker.fetch(
    new Request('https://compass.test/mcp', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    }),
  )

describe('Worker handler — transport and tools', () => {
  it('initialize returns protocol, tool capability, and methodology instructions', async () => {
    const res = await post({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: { protocolVersion: '2025-06-18' },
    })
    expect(res.status).toBe(200)
    const body = (await res.json()) as any
    expect(body.result.protocolVersion).toBe('2025-06-18')
    expect(body.result.capabilities.tools).toBeDefined()
    // Instructions must make the client RUN the journey, not just fetch it.
    expect(body.result.instructions).toMatch(/bearing/i)
    expect(body.result.instructions).toMatch(/one at a time/i)
    expect(body.result.instructions).toMatch(/do not answer for them/i)
    expect(body.result.instructions).toMatch(/gate/i)
    expect(body.result.instructions).not.toMatch(/software|write code/i)
  })

  it('tools/list returns the three tools', async () => {
    const res = await post({ jsonrpc: '2.0', id: 2, method: 'tools/list' })
    const body = (await res.json()) as any
    expect(body.result.tools.map((t: { name: string }) => t.name)).toEqual([
      'list_bearings',
      'get_bearing',
      'get_stage',
    ])
  })

  it('tools/call get_stage returns the stage', async () => {
    const res = await post({
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: { name: 'get_stage', arguments: { bearing: 'brand-builder', stage: 'discovery' } },
    })
    const body = (await res.json()) as any
    expect(body.result.isError).toBeUndefined()
    expect(JSON.parse(body.result.content[0].text).id).toBe('discovery')
  })

  it('tools/call on an unknown tool returns a -32602 error', async () => {
    const res = await post({
      jsonrpc: '2.0',
      id: 4,
      method: 'tools/call',
      params: { name: 'frobnicate', arguments: {} },
    })
    const body = (await res.json()) as any
    expect(body.error.code).toBe(-32602)
  })

  it('a notification with no id returns 202 and no body', async () => {
    const res = await post({ jsonrpc: '2.0', method: 'notifications/initialized' })
    expect(res.status).toBe(202)
    expect(await res.text()).toBe('')
  })

  it('a GET on /mcp returns 405', async () => {
    const res = await worker.fetch(new Request('https://compass.test/mcp', { method: 'GET' }))
    expect(res.status).toBe(405)
  })
})
