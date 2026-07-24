import { describe, it, expect } from 'vitest'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { loadBearing } from './load.ts'
import type { JourneyBearing, StandingBearing } from './types.ts'

const here = dirname(fileURLToPath(import.meta.url))
const journeyFixturePath = resolve(here, 'fixtures/journey-example.yaml')
const businessPlanPath = resolve(here, 'fixtures/business-plan.yaml')

describe('loadBearing — journey profile', () => {
  it('loads and validates the journey example', () => {
    const bearing = loadBearing(journeyFixturePath) as JourneyBearing
    expect(bearing.profile).toBe('journey')
    expect(bearing.bearing).toBe('brand-builder')
    expect(bearing.mode).toEqual(['build', 'extract'])
    expect(bearing.stages).toHaveLength(2)
    expect(bearing.stages[0]!.gate.requires_signoff).toBe(true)
    expect(bearing.stages[1]!.unlocks).toEqual(['brand-fusion', 'pricing'])
  })
})

describe('loadBearing — standing profile (business-plan.yaml)', () => {
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
    expect(tierB[0]!.id).toBe('revenue')
    expect(tierB[0]!.actual.source).toBe('savvy-finance')
    expect(tierB[0]!.actual.goal_tool).toBe('get_salon_goals')
    expect(tierB[0]!.actual.actual_tool).toBe('get_monthly_revenue')
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
})
