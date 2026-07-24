// The pure tool layer. handleTool is a synchronous function over the baked
// bearings with no I/O (ADR-001's testing posture) — every path is unit-testable
// without a Worker or a network. The JSON-RPC handler in index.ts owns transport
// and calls in here.
import type { Bearing } from '@compass/core/types'

export interface ToolResult {
  content: { type: 'text'; text: string }[]
  isError?: true
}

/** MCP tool definitions, surfaced by tools/list. */
export const TOOLS = [
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
  {
    name: 'get_stage',
    description: 'Get one stage of a journey bearing (its prompt and gate) by bearing slug and stage id.',
    inputSchema: {
      type: 'object',
      properties: {
        bearing: { type: 'string', description: 'the journey bearing slug id' },
        stage: { type: 'string', description: 'the stage id within that bearing' },
      },
      required: ['bearing', 'stage'],
      additionalProperties: false,
    },
  },
] as const

function ok(text: string): ToolResult {
  return { content: [{ type: 'text', text }] }
}

function err(text: string): ToolResult {
  return { content: [{ type: 'text', text }], isError: true }
}

/**
 * Dispatch a tool call over the baked bearings. Returns a ToolResult for any
 * known tool (including a tool-level error, flagged `isError`), or `null` when
 * the tool name is not one this server exposes — the handler maps null to a
 * JSON-RPC method-not-found error.
 */
export function handleTool(
  name: string,
  args: Record<string, unknown>,
  bearings: Bearing[],
): ToolResult | null {
  switch (name) {
    case 'list_bearings': {
      const list = bearings.map((b) => ({ bearing: b.bearing, name: b.name, profile: b.profile }))
      return ok(JSON.stringify(list, null, 2))
    }

    case 'get_bearing': {
      const slug = args.bearing
      const found = bearings.find((b) => b.bearing === slug)
      if (!found) return err(`no bearing with slug "${String(slug)}"`)
      return ok(JSON.stringify(found, null, 2))
    }

    case 'get_stage': {
      const slug = args.bearing
      const stageId = args.stage
      const found = bearings.find((b) => b.bearing === slug)
      if (!found) return err(`no bearing with slug "${String(slug)}"`)
      if (found.profile !== 'journey') {
        return err(`bearing "${found.bearing}" is a ${found.profile} bearing; stages are journey-only`)
      }
      const stage = found.stages.find((s) => s.id === stageId)
      if (!stage) return err(`journey "${found.bearing}" has no stage "${String(stageId)}"`)
      return ok(JSON.stringify(stage, null, 2))
    }

    default:
      return null
  }
}
