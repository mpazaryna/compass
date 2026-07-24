import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { parseBearing, BearingValidationError } from './parse.ts'
import type { JourneyBearing, StandingBearing } from './types.ts'

const here = dirname(fileURLToPath(import.meta.url))
const journeyFixturePath = resolve(here, 'fixtures/journey-example.yaml')
const businessPlanPath = resolve(here, 'fixtures/business-plan.yaml')

// Reading a fixture to build a string is fine here — the test file may touch
// node:fs. The guarantee under test is that parse.ts's own source never does.
const journeyText = readFileSync(journeyFixturePath, 'utf8')
const businessPlanText = readFileSync(businessPlanPath, 'utf8')

const miniJourney = [
  'bearing: mini',
  'name: "Mini"',
  'version: 1',
  'profile: journey',
  'stages:',
  '  - id: only',
  '    title: "Only"',
  '    prompt: "go"',
  '    gate:',
  '      rule: "done"',
].join('\n')

const miniStanding = [
  'bearing: mini-standing',
  'name: "Mini Standing"',
  'version: 1',
  'profile: standing',
  'targets: []',
  'rhythms: []',
  'initiatives: []',
].join('\n')

describe('parse.ts module boundary (fs structurally unreachable)', () => {
  it('parse.ts source imports no node: specifier', () => {
    const source = readFileSync(resolve(here, 'parse.ts'), 'utf8')
    expect(source).not.toMatch(/\bfrom\s+['"]node:/)
    expect(source).not.toMatch(/\bimport\s+['"]node:/)
    expect(source).not.toMatch(/\brequire\(\s*['"]node:/)
  })

  it('parseBearing is importable from parse.ts and callable on a string', () => {
    const bearing = parseBearing(journeyText) as JourneyBearing
    expect(bearing.profile).toBe('journey')
    expect(bearing.bearing).toBe('brand-builder')
  })
})

describe('parseBearing — shared envelope (v2)', () => {
  it('parses a minimal journey bearing with no audience and no source', () => {
    const bearing = parseBearing(miniJourney) as JourneyBearing
    expect(bearing.profile).toBe('journey')
    expect(bearing.bearing).toBe('mini')
  })

  it('parses a minimal standing bearing', () => {
    const bearing = parseBearing(miniStanding) as StandingBearing
    expect(bearing.profile).toBe('standing')
  })

  it('rejects a non-mapping top level', () => {
    expect(() => parseBearing('- just\n- a list')).toThrow(BearingValidationError)
  })

  it('rejects a missing "bearing" field, naming it', () => {
    const yaml = ['name: "X"', 'version: 1', 'profile: journey', 'stages: []'].join('\n')
    expect(() => parseBearing(yaml)).toThrow(/bearing/)
  })

  it('rejects a missing "name" field, naming it', () => {
    const yaml = ['bearing: x', 'version: 1', 'profile: standing', 'targets: []', 'rhythms: []', 'initiatives: []'].join('\n')
    expect(() => parseBearing(yaml)).toThrow(/name/)
  })

  it('rejects a non-integer version', () => {
    const yaml = miniStanding.replace('version: 1', 'version: 1.5')
    expect(() => parseBearing(yaml)).toThrow(/version/)
  })

  it('rejects an unknown profile', () => {
    const yaml = ['bearing: x', 'name: "X"', 'version: 1', 'profile: spiral'].join('\n')
    expect(() => parseBearing(yaml)).toThrow(/profile/)
  })

  it('rejects a bearing carrying the removed v1 "audience" key, naming it', () => {
    expect(() => parseBearing(miniJourney + '\naudience: owner\n')).toThrow(/audience/)
  })

  it('rejects an unknown top-level key', () => {
    expect(() => parseBearing(miniStanding + '\nwidget: 3\n')).toThrow(/not valid for profile/)
  })
})

describe('parseBearing — v2 envelope: source optional, client added', () => {
  it('parses a bearing that omits source', () => {
    expect(() => parseBearing(miniStanding)).not.toThrow()
  })

  it('accepts a source that is a non-empty array of strings', () => {
    const bearing = parseBearing(miniStanding + '\nsource: [a.md, b.md]\n') as StandingBearing
    expect(bearing.source).toEqual(['a.md', 'b.md'])
  })

  it('rejects a source that is present but not an array', () => {
    expect(() => parseBearing(miniStanding + '\nsource: nope\n')).toThrow(/source/)
  })

  it('rejects a source that is present but empty', () => {
    expect(() => parseBearing(miniStanding + '\nsource: []\n')).toThrow(/source/)
  })

  it('rejects a source array with a non-string element', () => {
    expect(() => parseBearing(miniStanding + '\nsource: [a.md, 3]\n')).toThrow(/source/)
  })

  it('carries an optional client through', () => {
    const bearing = parseBearing(miniJourney + '\nclient: acme-salon\n') as JourneyBearing
    expect(bearing.client).toBe('acme-salon')
  })

  it('omits client entirely when absent (no undefined key)', () => {
    const bearing = parseBearing(miniJourney) as JourneyBearing
    expect('client' in bearing).toBe(false)
  })

  it('rejects an empty client string', () => {
    expect(() => parseBearing(miniJourney + '\nclient: ""\n')).toThrow(/client/)
  })
})

describe('parseBearing — profile dispatch rejects mismatched keys', () => {
  it('rejects a standing-only key (cadence) in a journey bearing', () => {
    expect(() => parseBearing(journeyText + '\ncadence: weekly\n')).toThrow(/cadence/)
  })

  it('rejects a standing-only key (targets) in a journey bearing', () => {
    expect(() => parseBearing(journeyText + '\ntargets: []\n')).toThrow(
      /not valid for profile "journey"/,
    )
  })

  it('rejects a journey-only key (gate) in a standing bearing', () => {
    expect(() => parseBearing(businessPlanText + '\ngate:\n  rule: "nope"\n')).toThrow(
      /not valid for profile "standing"/,
    )
  })

  it('rejects a journey-only key (stages) in a standing bearing', () => {
    expect(() => parseBearing(businessPlanText + '\nstages: []\n')).toThrow(/stages/)
  })
})
