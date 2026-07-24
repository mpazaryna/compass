// Compass MCP server (M2). A hand-rolled JSON-RPC handler over Streamable HTTP
// (MCP 2025-06-18), stateless — no Durable Objects, KV, or auth (phase 1). The
// handler owns transport; the pure `handleTool` owns tool logic.
//
// The Worker imports only baked plain data (BEARINGS) and the pure tool layer —
// no `yaml`, no `@compass/core/parse`, no `node:` builtin. Bearings are parsed
// and validated at build time by scripts/build-bearings.mjs.
import { handleTool, TOOLS } from './tools.ts'
import { INSTRUCTIONS } from './instructions.ts'
import { BEARINGS } from './bearings.generated.ts'

const SERVER_INFO = { name: 'compass', version: '0.0.0' }
const PROTOCOL_VERSION = '2025-06-18'

type JsonRpcId = string | number
interface JsonRpcRequest {
  jsonrpc: '2.0'
  id?: JsonRpcId
  method: string
  params?: Record<string, unknown>
}

const ok = (id: JsonRpcId, result: unknown) => ({ jsonrpc: '2.0' as const, id, result })
const err = (id: JsonRpcId, code: number, message: string) => ({
  jsonrpc: '2.0' as const,
  id,
  error: { code, message },
})

function handle(req: JsonRpcRequest): object {
  const id = req.id as JsonRpcId
  switch (req.method) {
    case 'initialize':
      return ok(id, {
        protocolVersion:
          (req.params?.protocolVersion as string | undefined) ?? PROTOCOL_VERSION,
        capabilities: { tools: {} },
        serverInfo: SERVER_INFO,
        instructions: INSTRUCTIONS,
      })

    case 'ping':
      return ok(id, {})

    case 'tools/list':
      return ok(id, { tools: TOOLS })

    case 'tools/call': {
      const name = req.params?.name
      if (typeof name !== 'string') return err(id, -32602, 'tools/call requires a string "name"')
      const args = (req.params?.arguments as Record<string, unknown> | undefined) ?? {}
      const result = handleTool(name, args, BEARINGS)
      if (result === null) return err(id, -32602, `unknown tool: ${name}`)
      return ok(id, result)
    }

    default:
      return err(id, -32601, `method not found: ${req.method}`)
  }
}

export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)

    if (url.pathname === '/') {
      return new Response('compass mcp — POST JSON-RPC to /mcp\n', {
        headers: { 'content-type': 'text/plain' },
      })
    }
    if (url.pathname !== '/mcp') {
      return new Response('not found', { status: 404 })
    }

    // Streamable HTTP: this stateless server offers no server-initiated SSE, so a
    // GET (which would open the stream) is a 405 — allowed by the spec.
    if (request.method !== 'POST') {
      return new Response('method not allowed', { status: 405, headers: { allow: 'POST' } })
    }

    let body: JsonRpcRequest
    try {
      body = (await request.json()) as JsonRpcRequest
    } catch {
      return Response.json(err(0, -32700, 'parse error'), { status: 400 })
    }

    // A notification (no id) — e.g. notifications/initialized — gets no response.
    if (body.id === undefined || body.id === null) {
      return new Response(null, { status: 202 })
    }

    return Response.json(handle(body))
  },
}
