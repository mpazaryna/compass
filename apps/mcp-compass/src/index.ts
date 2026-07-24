// Compass MCP server — walking-skeleton spike.
//
// A hand-rolled JSON-RPC handler over Streamable HTTP (MCP 2025-06-18),
// stateless, no Durable Objects / KV / auth. It exists to prove the mechanics
// SHE-12 cares about — Claude Desktop connector + transport + Cloudflare deploy
// — end to end, serving real bearings baked by M1's loader. Folds into M2.
//
// We import from '@compass/core/parse', NOT the package index: index.ts pulls in
// load.ts, which imports node:fs and would break on a Worker. This is the seam
// M1's module split was built for.
import { parseBearing } from '@compass/core/parse'
import type { Bearing } from '@compass/core/types'
import { BEARING_SOURCES } from './bearings.generated.ts'

// Parse the baked bearings once, at cold start. An invalid bearing throws here
// and the Worker fails fast rather than serving bad data.
const BEARINGS: Bearing[] = BEARING_SOURCES.map((s) => parseBearing(s))

const SERVER_INFO = { name: 'compass', version: '0.0.0-spike' }
const PROTOCOL_VERSION = '2025-06-18'

const TOOLS = [
  {
    name: 'list_bearings',
    description: 'List the bearings this Compass server serves (slug, name, profile).',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'get_bearing',
    description: 'Get one full parsed bearing by its slug id.',
    inputSchema: {
      type: 'object',
      properties: { bearing: { type: 'string', description: 'the bearing slug id' } },
      required: ['bearing'],
      additionalProperties: false,
    },
  },
]

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
const textContent = (text: string, isError = false) => ({
  content: [{ type: 'text', text }],
  ...(isError ? { isError: true } : {}),
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
      })

    case 'ping':
      return ok(id, {})

    case 'tools/list':
      return ok(id, { tools: TOOLS })

    case 'tools/call': {
      const name = req.params?.name as string | undefined
      const args = (req.params?.arguments as Record<string, unknown> | undefined) ?? {}

      if (name === 'list_bearings') {
        const list = BEARINGS.map((b) => ({ bearing: b.bearing, name: b.name, profile: b.profile }))
        return ok(id, textContent(JSON.stringify(list, null, 2)))
      }
      if (name === 'get_bearing') {
        const slug = args.bearing
        const found = BEARINGS.find((b) => b.bearing === slug)
        if (!found) {
          return ok(id, textContent(`no bearing with slug "${String(slug)}"`, true))
        }
        return ok(id, textContent(JSON.stringify(found, null, 2)))
      }
      return err(id, -32602, `unknown tool: ${String(name)}`)
    }

    default:
      return err(id, -32601, `method not found: ${req.method}`)
  }
}

export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)

    if (url.pathname === '/') {
      return new Response('compass mcp (spike) — POST JSON-RPC to /mcp\n', {
        headers: { 'content-type': 'text/plain' },
      })
    }
    if (url.pathname !== '/mcp') {
      return new Response('not found', { status: 404 })
    }

    // Streamable HTTP: this stateless spike offers no server-initiated SSE, so a
    // GET (which would open the stream) is a 405 — allowed by the spec.
    if (request.method === 'GET') {
      return new Response('method not allowed', { status: 405, headers: { allow: 'POST' } })
    }
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
