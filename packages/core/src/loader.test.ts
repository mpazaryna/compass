import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { loadBearing, parseBearing, BearingValidationError } from './loader.ts'
import type { JourneyBearing, StandingBearing } from './types.ts'

const here = dirname(fileURLToPath(import.meta.url))
// Ported from savvy: the standing fixture now lives beside the journey one.
// (savvy referenced os/web/bearings/business-plan.yaml three levels up.)
const businessPlanPath = resolve(here, 'fixtures/business-plan.yaml')
const journeyFixturePath = resolve(here, 'fixtures/journey-example.yaml')

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

describe('parseBearing — journey profile', () => {
  it('loads and validates the journey example', () => {
    const bearing = loadBearing(journeyFixturePath) as JourneyBearing
    expect(bearing.profile).toBe('journey')
    expect(bearing.bearing).toBe('brand-builder')
    expect(bearing.mode).toEqual(['build', 'extract'])
    expect(bearing.stages).toHaveLength(2)
    expect(bearing.stages[0].gate.requires_signoff).toBe(true)
    expect(bearing.stages[1].unlocks).toEqual(['brand-fusion', 'pricing'])
  })

  it('rejects a standing-only key (cadence) in a journey bearing', () => {
    const yaml = readFileSync(journeyFixturePath, 'utf8') + '\ncadence: weekly\n'
    expect(() => parseBearing(yaml)).toThrow(/cadence/)
  })

  it('rejects a standing-only key (targets) in a journey bearing', () => {
    const yaml = readFileSync(journeyFixturePath, 'utf8') + '\ntargets: []\n'
    expect(() => parseBearing(yaml)).toThrow(/not valid for profile "journey"/)
  })
})

describe('parseBearing — standing profile (business-plan.yaml)', () => {
  it('loads and validates the authored business-plan bearing', () => {
    const bearing = loadBearing(businessPlanPath) as StandingBearing
    expect(bearing.profile).toBe('standing')
    expect(bearing.bearing).toBe('business-plan')
    expect(bearing.audience).toBe('ceo')
    expect(bearing.source.length).toBeGreaterThan(0)
  })

  it('has exactly one Tier B target (revenue) sourced from savvy-finance', () => {
    const bearing = loadBearing(businessPlanPath) as StandingBearing
    const tierB = bearing.targets.filter((t) => t.tier === 'B')
    expect(tierB).toHaveLength(1)
    expect(tierB[0].id).toBe('revenue')
    expect(tierB[0].actual.source).toBe('savvy-finance')
    expect(tierB[0].actual.goal_tool).toBe('get_salon_goals')
    expect(tierB[0].actual.actual_tool).toBe('get_monthly_revenue')
  })

  it('has Tier C targets with source: none', () => {
    const bearing = loadBearing(businessPlanPath) as StandingBearing
    const tierC = bearing.targets.filter((t) => t.tier === 'C')
    expect(tierC.length).toBeGreaterThan(0)
    expect(tierC.every((t) => t.actual.source === 'none')).toBe(true)
  })

  it('keeps every target flagged confirmed: false ([confirm with Sheri])', () => {
    const bearing = loadBearing(businessPlanPath) as StandingBearing
    expect(bearing.targets.every((t) => t.confirmed === false)).toBe(true)
  })

  it('carries rhythms with cadence + reset anchor and initiatives with milestones', () => {
    const bearing = loadBearing(businessPlanPath) as StandingBearing
    expect(bearing.rhythms.length).toBeGreaterThan(0)
    expect(bearing.rhythms.every((r) => ['weekly', 'monthly'].includes(r.cadence))).toBe(true)
    expect(bearing.rhythms.some((r) => r.reset === 'monday')).toBe(true)
    expect(bearing.rhythms.some((r) => r.reset === 'first')).toBe(true)

    expect(bearing.initiatives.map((i) => i.id)).toContain('alexandra-launch')
    expect(bearing.initiatives.map((i) => i.id)).toContain('savvy-circle')
    expect(bearing.initiatives.every((i) => i.milestones.length > 0)).toBe(true)
  })

  it('rejects a journey-only key (gate) in a standing bearing', () => {
    const yaml = readFileSync(businessPlanPath, 'utf8') + '\ngate:\n  rule: "nope"\n'
    expect(() => parseBearing(yaml)).toThrow(/not valid for profile "standing"/)
  })

  it('rejects a journey-only key (stages) in a standing bearing', () => {
    const yaml = readFileSync(businessPlanPath, 'utf8') + '\nstages: []\n'
    expect(() => parseBearing(yaml)).toThrow(/stages/)
  })
})
