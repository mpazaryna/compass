import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { parseBearing, BearingValidationError } from './parse.ts'
import type { JourneyBearing } from './types.ts'

const here = dirname(fileURLToPath(import.meta.url))
const journeyFixturePath = resolve(here, 'fixtures/journey-example.yaml')
const businessPlanPath = resolve(here, 'fixtures/business-plan.yaml')

// Reading a fixture to build a string is fine here — the test file may touch
// node:fs. The guarantee under test is that parse.ts's own source never does.
const journeyText = readFileSync(journeyFixturePath, 'utf8')
const businessPlanText = readFileSync(businessPlanPath, 'utf8')

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

describe('parseBearing — shared envelope', () => {
  it('rejects a non-mapping top level', () => {
    expect(() => parseBearing('- just\n- a list')).toThrow(BearingValidationError)
  })

  it('rejects an unknown profile', () => {
    const yaml = [
      'bearing: x',
      'name: "X"',
      'version: 1',
      'profile: spiral',
      'audience: ceo',
      'source: [a.md]',
    ].join('\n')
    expect(() => parseBearing(yaml)).toThrow(/profile/)
  })

  it('rejects a missing envelope field (source)', () => {
    const yaml = [
      'bearing: x',
      'name: "X"',
      'version: 1',
      'profile: standing',
      'audience: ceo',
      'targets: []',
      'rhythms: []',
      'initiatives: []',
    ].join('\n')
    expect(() => parseBearing(yaml)).toThrow(/source/)
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
