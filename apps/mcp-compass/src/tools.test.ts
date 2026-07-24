import { describe, it, expect } from 'vitest'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { loadBearing } from '@compass/core'
import type { Bearing } from '@compass/core/types'
import { handleTool, TOOLS } from './tools.ts'

const here = dirname(fileURLToPath(import.meta.url))
const fixtures = resolve(here, '../../../packages/core/src/fixtures')

// Real bearings, loaded the way the bake will. handleTool is pure over these.
const bearings: Bearing[] = [
  loadBearing(resolve(fixtures, 'journey-example.yaml')),
  loadBearing(resolve(fixtures, 'standing-example.yaml')),
]

describe('TOOLS', () => {
  it('exposes exactly the three M2 tools', () => {
    expect(TOOLS.map((t) => t.name)).toEqual(['list_bearings', 'get_bearing', 'get_stage'])
  })
})

describe('handleTool — list_bearings', () => {
  it('lists slug, name, and profile for every bearing', () => {
    const result = handleTool('list_bearings', {}, bearings)!
    expect(result.isError).toBeUndefined()
    const list = JSON.parse(result.content[0]!.text)
    expect(list).toHaveLength(2)
    expect(list.map((b: { bearing: string }) => b.bearing)).toEqual(
      expect.arrayContaining(['brand-builder', 'example-standing']),
    )
    expect(list[0]).toHaveProperty('profile')
  })
})

describe('handleTool — get_bearing', () => {
  it('returns the full parsed bearing', () => {
    const result = handleTool('get_bearing', { bearing: 'brand-builder' }, bearings)!
    expect(result.isError).toBeUndefined()
    const bearing = JSON.parse(result.content[0]!.text)
    expect(bearing.profile).toBe('journey')
    expect(bearing.client).toBe('acme-salon')
  })

  it('errors on an unknown slug, naming it', () => {
    const result = handleTool('get_bearing', { bearing: 'nope' }, bearings)!
    expect(result.isError).toBe(true)
    expect(result.content[0]!.text).toMatch(/nope/)
  })
})

describe('handleTool — get_stage', () => {
  it('returns a journey stage prompt and gate', () => {
    const result = handleTool('get_stage', { bearing: 'brand-builder', stage: 'discovery' }, bearings)!
    expect(result.isError).toBeUndefined()
    const stage = JSON.parse(result.content[0]!.text)
    expect(stage.id).toBe('discovery')
    expect(stage.gate).toBeDefined()
  })

  it('errors on a standing bearing — stages are journey-only', () => {
    const result = handleTool('get_stage', { bearing: 'example-standing', stage: 'x' }, bearings)!
    expect(result.isError).toBe(true)
    expect(result.content[0]!.text).toMatch(/journey-only/)
  })

  it('errors on an unknown stage id, naming it', () => {
    const result = handleTool('get_stage', { bearing: 'brand-builder', stage: 'nope' }, bearings)!
    expect(result.isError).toBe(true)
    expect(result.content[0]!.text).toMatch(/nope/)
  })

  it('errors on an unknown bearing', () => {
    const result = handleTool('get_stage', { bearing: 'nope', stage: 'discovery' }, bearings)!
    expect(result.isError).toBe(true)
    expect(result.content[0]!.text).toMatch(/nope/)
  })
})

describe('handleTool — unknown tool', () => {
  it('returns null so the handler can map it to a JSON-RPC error', () => {
    expect(handleTool('frobnicate', {}, bearings)).toBeNull()
  })
})
