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

// --- Step 4: construct, don't cast -------------------------------------------

const journeyWithStage = (extra: string): string =>
  [
    'bearing: j',
    'name: "J"',
    'version: 1',
    'profile: journey',
    'stages:',
    '  - id: s1',
    '    title: "S1"',
    '    prompt: "p"',
    '    gate:',
    '      rule: "r"',
  ].join('\n') + extra

describe('parseBearing — journey optional fields validated, not cast through', () => {
  it('accepts a stage with valid artifact, unlocks, and scoring', () => {
    const yaml = journeyWithStage(
      ['', '    artifact: "Doc"', '    unlocks: [a, b]', '    scoring:', '      dimensions: [clarity]'].join('\n'),
    )
    const bearing = parseBearing(yaml) as JourneyBearing
    expect(bearing.stages[0]!.artifact).toBe('Doc')
    expect(bearing.stages[0]!.unlocks).toEqual(['a', 'b'])
    expect(bearing.stages[0]!.scoring!.dimensions).toEqual(['clarity'])
  })

  it('rejects a non-string artifact', () => {
    expect(() => parseBearing(journeyWithStage('\n    artifact: 3\n'))).toThrow(/artifact/)
  })

  it('rejects unlocks that is not an array of strings', () => {
    expect(() => parseBearing(journeyWithStage('\n    unlocks: nope\n'))).toThrow(/unlocks/)
  })

  it('rejects an unlocks array with a non-string element', () => {
    expect(() => parseBearing(journeyWithStage('\n    unlocks: [a, 3]\n'))).toThrow(/unlocks/)
  })

  it('rejects an empty scoring.dimensions', () => {
    const yaml = journeyWithStage(['', '    scoring:', '      dimensions: []'].join('\n'))
    expect(() => parseBearing(yaml)).toThrow(/dimensions/)
  })

  it('rejects a scoring.dimensions with a non-string element', () => {
    const yaml = journeyWithStage(['', '    scoring:', '      dimensions: [ok, 3]'].join('\n'))
    expect(() => parseBearing(yaml)).toThrow(/dimensions/)
  })
})

const hasNoUndefinedValue = (value: unknown): boolean => {
  if (Array.isArray(value)) return value.every(hasNoUndefinedValue)
  if (value !== null && typeof value === 'object') {
    return Object.values(value).every((v) => v !== undefined && hasNoUndefinedValue(v))
  }
  return true
}

describe('parseBearing — no key carries an undefined value at any depth', () => {
  it('holds for a minimal journey bearing', () => {
    expect(hasNoUndefinedValue(parseBearing(miniJourney))).toBe(true)
  })
  it('holds for a minimal standing bearing', () => {
    expect(hasNoUndefinedValue(parseBearing(miniStanding))).toBe(true)
  })
})

// --- Step 5: journey stage id uniqueness -------------------------------------

const twoStages = (idA: string, idB: string): string =>
  [
    'bearing: j',
    'name: "J"',
    'version: 1',
    'profile: journey',
    'stages:',
    `  - id: ${idA}`,
    '    title: "A"',
    '    prompt: "p"',
    '    gate:',
    '      rule: "r"',
    `  - id: ${idB}`,
    '    title: "B"',
    '    prompt: "p"',
    '    gate:',
    '      rule: "r"',
  ].join('\n')

describe('parseBearing — journey stage ids are unique within a bearing', () => {
  it('rejects duplicate stage ids, naming the id', () => {
    expect(() => parseBearing(twoStages('dup', 'dup'))).toThrow(/duplicate stage id "dup"/)
  })

  it('accepts distinct stage ids', () => {
    expect(() => parseBearing(twoStages('a', 'b'))).not.toThrow()
  })
})

// --- Step 6: standing + SAV-121's two fixes ----------------------------------

const standingTarget = (extra = ''): string =>
  [
    'bearing: s',
    'name: "S"',
    'version: 1',
    'profile: standing',
    'targets:',
    '  - id: t1',
    '    label: "T1"',
    '    target: { value: 100, unit: usd }',
    '    actual: { source: none }',
    '    tier: C',
    '    confirmed: false' + extra,
    'rhythms: []',
    'initiatives: []',
  ].join('\n')

const standingRhythm = (cadence: string, reset: string): string =>
  [
    'bearing: s',
    'name: "S"',
    'version: 1',
    'profile: standing',
    'targets: []',
    'rhythms:',
    '  - id: r1',
    '    label: "R1"',
    `    cadence: ${cadence}`,
    `    reset: ${reset}`,
    'initiatives: []',
  ].join('\n')

describe('parseBearing — target direction materialised (SAV-121)', () => {
  it('defaults a target without direction to gte in the output', () => {
    const bearing = parseBearing(standingTarget()) as StandingBearing
    expect(bearing.targets[0]!.direction).toBe('gte')
  })

  it('carries an explicit lte direction', () => {
    const bearing = parseBearing(standingTarget('\n    direction: lte')) as StandingBearing
    expect(bearing.targets[0]!.direction).toBe('lte')
  })

  it('rejects an invalid direction', () => {
    expect(() => parseBearing(standingTarget('\n    direction: sideways'))).toThrow(/direction/)
  })
})

describe('parseBearing — rhythm cadence/anchor pairing (SAV-121 daily)', () => {
  it('accepts daily with reset local-day', () => {
    expect(() => parseBearing(standingRhythm('daily', 'local-day'))).not.toThrow()
  })

  it('accepts weekly with monday and monthly with first', () => {
    expect(() => parseBearing(standingRhythm('weekly', 'monday'))).not.toThrow()
    expect(() => parseBearing(standingRhythm('monthly', 'first'))).not.toThrow()
  })

  it('rejects daily paired with reset monday', () => {
    expect(() => parseBearing(standingRhythm('daily', 'monday'))).toThrow(/local-day/)
  })

  it('rejects weekly paired with reset first', () => {
    expect(() => parseBearing(standingRhythm('weekly', 'first'))).toThrow(/monday/)
  })

  it('rejects monthly paired with reset monday', () => {
    expect(() => parseBearing(standingRhythm('monthly', 'monday'))).toThrow(/first/)
  })

  it('rejects an unknown cadence', () => {
    expect(() => parseBearing(standingRhythm('yearly', 'first'))).toThrow(/cadence/)
  })
})
