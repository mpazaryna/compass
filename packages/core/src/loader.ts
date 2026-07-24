// @savvy/compass — bearing loader + validator
// Loads a bearing YAML file, validates the shared envelope, dispatches on
// `profile`, and returns a typed, parsed bearing. A profile-mismatched key
// (e.g. `gate` in a standing bearing, `cadence` in a journey bearing) is a
// validation error, not a silent ignore. Schema: SAV-77.

import { readFileSync } from 'node:fs'
import { parse as parseYaml } from 'yaml'
import type {
  Bearing,
  BearingProfile,
  Initiative,
  JourneyBearing,
  JourneyStage,
  Rhythm,
  StandingBearing,
  Target,
  TargetTier,
} from './types.ts'

/** Thrown for any envelope or profile-shape violation. */
export class BearingValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'BearingValidationError'
  }
}

const ENVELOPE_KEYS = ['bearing', 'name', 'version', 'profile', 'audience', 'source'] as const

/** Extra top-level keys each profile is allowed to carry beyond the envelope. */
const PROFILE_KEYS: Record<BearingProfile, readonly string[]> = {
  journey: ['mode', 'stages'],
  standing: ['targets', 'rhythms', 'initiatives'],
}

const PROFILES: readonly BearingProfile[] = ['journey', 'standing']

type Dict = Record<string, unknown>

function isPlainObject(value: unknown): value is Dict {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function fail(message: string): never {
  throw new BearingValidationError(message)
}

function requireString(obj: Dict, key: string, ctx: string): string {
  const v = obj[key]
  if (typeof v !== 'string' || v.length === 0) {
    fail(`${ctx}: "${key}" must be a non-empty string`)
  }
  return v
}

function requireArray(obj: Dict, key: string, ctx: string): unknown[] {
  const v = obj[key]
  if (!Array.isArray(v)) fail(`${ctx}: "${key}" must be an array`)
  return v
}

/** Validate the envelope shared by every bearing, then dispatch on profile. */
export function parseBearing(yamlText: string): Bearing {
  const raw: unknown = parseYaml(yamlText)
  if (!isPlainObject(raw)) fail('bearing must be a YAML mapping at the top level')

  // --- Shared envelope ---
  const bearing = requireString(raw, 'bearing', 'envelope')
  const ctx = `bearing "${bearing}"`
  requireString(raw, 'name', ctx)

  if (typeof raw.version !== 'number' || !Number.isInteger(raw.version)) {
    fail(`${ctx}: "version" must be an integer`)
  }

  const profile = raw.profile
  if (typeof profile !== 'string' || !PROFILES.includes(profile as BearingProfile)) {
    fail(`${ctx}: "profile" must be one of ${PROFILES.join(' | ')} (got ${JSON.stringify(profile)})`)
  }

  requireString(raw, 'audience', ctx)

  const source = requireArray(raw, 'source', ctx)
  if (source.length === 0 || !source.every((s) => typeof s === 'string')) {
    fail(`${ctx}: "source" must be a non-empty array of strings`)
  }

  // --- Profile dispatch: strict top-level allow-list ---
  // Any key that is neither part of the envelope nor allowed for the declared
  // profile is a validation error. This is what catches a `gate` in a standing
  // bearing or a `cadence` in a journey bearing instead of silently ignoring it.
  const allowed = new Set<string>([...ENVELOPE_KEYS, ...PROFILE_KEYS[profile as BearingProfile]])
  for (const key of Object.keys(raw)) {
    if (!allowed.has(key)) {
      fail(
        `${ctx}: key "${key}" is not valid for profile "${profile}" ` +
          `(allowed: ${[...allowed].join(', ')})`,
      )
    }
  }

  return profile === 'journey'
    ? validateJourney(raw, ctx)
    : validateStanding(raw, ctx)
}

/** Read a bearing YAML file from disk and parse it. */
export function loadBearing(filePath: string): Bearing {
  let text: string
  try {
    text = readFileSync(filePath, 'utf8')
  } catch (err) {
    fail(`could not read bearing file "${filePath}": ${(err as Error).message}`)
  }
  return parseBearing(text)
}

// --- Journey validation ------------------------------------------------------

function validateJourney(raw: Dict, ctx: string): JourneyBearing {
  const stagesRaw = requireArray(raw, 'stages', ctx)
  if (stagesRaw.length === 0) fail(`${ctx}: "stages" must not be empty`)

  const stages: JourneyStage[] = stagesRaw.map((s, i) => {
    const sctx = `${ctx} stages[${i}]`
    if (!isPlainObject(s)) fail(`${sctx}: must be a mapping`)
    requireString(s, 'id', sctx)
    requireString(s, 'title', sctx)
    requireString(s, 'prompt', sctx)

    const gate = s.gate
    if (!isPlainObject(gate)) fail(`${sctx}: "gate" must be a mapping`)
    requireString(gate, 'rule', `${sctx}.gate`)
    if (gate.requires_signoff !== undefined && typeof gate.requires_signoff !== 'boolean') {
      fail(`${sctx}.gate: "requires_signoff" must be a boolean`)
    }

    return s as unknown as JourneyStage
  })

  if (raw.mode !== undefined) {
    if (!Array.isArray(raw.mode) || !raw.mode.every((m) => typeof m === 'string')) {
      fail(`${ctx}: "mode" must be an array of strings`)
    }
  }

  return { ...(raw as object), stages } as JourneyBearing
}

// --- Standing validation -----------------------------------------------------

const TIERS: readonly TargetTier[] = ['A', 'B', 'C']

function validateStanding(raw: Dict, ctx: string): StandingBearing {
  const targets = validateTargets(requireArray(raw, 'targets', ctx), ctx)
  const rhythms = validateRhythms(requireArray(raw, 'rhythms', ctx), ctx)
  const initiatives = validateInitiatives(requireArray(raw, 'initiatives', ctx), ctx)
  return { ...(raw as object), targets, rhythms, initiatives } as StandingBearing
}

function validateTargets(rawTargets: unknown[], ctx: string): Target[] {
  return rawTargets.map((t, i) => {
    const tctx = `${ctx} targets[${i}]`
    if (!isPlainObject(t)) fail(`${tctx}: must be a mapping`)
    requireString(t, 'id', tctx)
    requireString(t, 'label', tctx)

    const target = t.target
    if (!isPlainObject(target) || typeof target.value !== 'number' || typeof target.unit !== 'string') {
      fail(`${tctx}: "target" must have a numeric "value" and a string "unit"`)
    }

    const actual = t.actual
    if (!isPlainObject(actual)) fail(`${tctx}: "actual" must be a mapping`)
    requireString(actual, 'source', `${tctx}.actual`)

    if (typeof t.tier !== 'string' || !TIERS.includes(t.tier as TargetTier)) {
      fail(`${tctx}: "tier" must be one of ${TIERS.join(' | ')}`)
    }
    if (typeof t.confirmed !== 'boolean') {
      fail(`${tctx}: "confirmed" must be a boolean`)
    }

    return t as unknown as Target
  })
}

function validateRhythms(rawRhythms: unknown[], ctx: string): Rhythm[] {
  return rawRhythms.map((r, i) => {
    const rctx = `${ctx} rhythms[${i}]`
    if (!isPlainObject(r)) fail(`${rctx}: must be a mapping`)
    requireString(r, 'id', rctx)
    requireString(r, 'label', rctx)
    if (r.cadence !== 'weekly' && r.cadence !== 'monthly') {
      fail(`${rctx}: "cadence" must be weekly | monthly`)
    }
    requireString(r, 'reset', rctx)
    if (r.count !== undefined && typeof r.count !== 'number') {
      fail(`${rctx}: "count" must be a number`)
    }
    return r as unknown as Rhythm
  })
}

function validateInitiatives(rawInitiatives: unknown[], ctx: string): Initiative[] {
  return rawInitiatives.map((it, i) => {
    const ictx = `${ctx} initiatives[${i}]`
    if (!isPlainObject(it)) fail(`${ictx}: must be a mapping`)
    requireString(it, 'id', ictx)
    requireString(it, 'label', ictx)
    const milestones = requireArray(it, 'milestones', ictx)
    milestones.forEach((m, j) => {
      const mctx = `${ictx} milestones[${j}]`
      if (!isPlainObject(m)) fail(`${mctx}: must be a mapping`)
      requireString(m, 'id', mctx)
      requireString(m, 'label', mctx)
    })
    return it as unknown as Initiative
  })
}
