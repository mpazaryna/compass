import { describe, it, expect } from 'vitest'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { loadBearing } from './load.ts'
import { parseBearing } from './parse.ts'
import { readFileSync } from 'node:fs'
import type { JourneyBearing, StandingBearing } from './types.ts'

const here = dirname(fileURLToPath(import.meta.url))
const journeyFixturePath = resolve(here, 'fixtures/journey-example.yaml')
const standingFixturePath = resolve(here, 'fixtures/standing-example.yaml')

describe('loadBearing — journey profile', () => {
  it('loads and validates the journey example', () => {
    const bearing = loadBearing(journeyFixturePath) as JourneyBearing
    expect(bearing.profile).toBe('journey')
    expect(bearing.bearing).toBe('brand-builder')
    expect(bearing.client).toBe('acme-salon')
    expect(bearing.mode).toEqual(['build', 'extract'])
    expect(bearing.stages).toHaveLength(2)
    expect(bearing.stages[0]!.gate.requires_signoff).toBe(true)
    expect(bearing.stages[0]!.artifact).toBe('Discovery synthesis')
    expect(bearing.stages[1]!.unlocks).toEqual(['brand-fusion', 'pricing'])
    expect(bearing.stages[1]!.scoring!.dimensions).toEqual(['clarity', 'differentiation'])
  })
})

describe('loadBearing — standing profile (standing-example.yaml)', () => {
  it('loads and validates the standing example', () => {
    const bearing = loadBearing(standingFixturePath) as StandingBearing
    expect(bearing.profile).toBe('standing')
    expect(bearing.bearing).toBe('example-standing')
    expect(bearing.client).toBe('example-co')
    expect(bearing.source).toBeDefined()
    expect(bearing.source!.length).toBeGreaterThan(0)
  })

  it('has a Tier B target (revenue) with a live actual source and both tools', () => {
    const bearing = loadBearing(standingFixturePath) as StandingBearing
    const tierB = bearing.targets.filter((t) => t.tier === 'B')
    expect(tierB).toHaveLength(1)
    expect(tierB[0]!.id).toBe('revenue')
    expect(tierB[0]!.actual.source).toBe('example-finance')
    expect(tierB[0]!.actual.goal_tool).toBe('get_goals')
    expect(tierB[0]!.actual.actual_tool).toBe('get_revenue')
  })

  it('has a Tier C target with source: none', () => {
    const bearing = loadBearing(standingFixturePath) as StandingBearing
    const tierC = bearing.targets.filter((t) => t.tier === 'C')
    expect(tierC.length).toBeGreaterThan(0)
    expect(tierC.every((t) => t.actual.source === 'none')).toBe(true)
  })

  it('materialises both comparator directions', () => {
    const bearing = loadBearing(standingFixturePath) as StandingBearing
    const byId = new Map(bearing.targets.map((t) => [t.id, t]))
    expect(byId.get('revenue')!.direction).toBe('gte')
    expect(byId.get('churn')!.direction).toBe('lte')
  })

  it('carries all three cadences with their correct reset anchors', () => {
    const bearing = loadBearing(standingFixturePath) as StandingBearing
    const byCadence = new Map(bearing.rhythms.map((r) => [r.cadence, r.reset]))
    expect(byCadence.get('weekly')).toBe('monday')
    expect(byCadence.get('monthly')).toBe('first')
    expect(byCadence.get('daily')).toBe('local-day')
  })

  it('carries initiatives with milestones', () => {
    const bearing = loadBearing(standingFixturePath) as StandingBearing
    expect(bearing.initiatives.map((i) => i.id)).toContain('launch')
    expect(bearing.initiatives.every((i) => i.milestones.length > 0)).toBe(true)
  })
})

describe('loadBearing and parseBearing agree', () => {
  it('produce deep-equal results for the journey fixture', () => {
    const viaLoad = loadBearing(journeyFixturePath)
    const viaParse = parseBearing(readFileSync(journeyFixturePath, 'utf8'))
    expect(viaLoad).toEqual(viaParse)
  })

  it('produce deep-equal results for the standing fixture', () => {
    const viaLoad = loadBearing(standingFixturePath)
    const viaParse = parseBearing(readFileSync(standingFixturePath, 'utf8'))
    expect(viaLoad).toEqual(viaParse)
  })
})
