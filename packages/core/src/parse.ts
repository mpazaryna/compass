// @compass/core — bearing parser + validator (pure)
// Validates the shared envelope, dispatches on `profile`, and returns a typed,
// parsed bearing constructed field by field from validated values. A
// profile-mismatched key (e.g. `gate` in a standing bearing, `cadence` in a
// journey bearing) is a validation error, not a silent ignore.
//
// This module imports no `node:` builtin — it is the entry point a Worker uses
// (Workers have no filesystem). The filesystem reader lives in `load.ts`, which
// delegates here. The boundary is enforced by a test, not by discipline.
//
// Nothing is cast from raw to a typed shape: every returned value is built from
// values that were individually validated, so an unvalidated field cannot ride
// through. Optional fields are omitted keys when absent, never `undefined`
// (exactOptionalPropertyTypes), and the output is plain data — no class
// instances, Map, Set, or Date — so it survives a JSON round-trip unchanged.
// Schema: SAV-77.

import { parse as parseYaml } from 'yaml'
import type {
  Bearing,
  BearingEnvelope,
  BearingProfile,
  Initiative,
  JourneyBearing,
  JourneyStage,
  JourneyStageGate,
  JourneyStageScoring,
  Rhythm,
  RhythmCadence,
  StandingBearing,
  Target,
  TargetActual,
  TargetDirection,
  TargetTier,
  TargetValue,
} from './types.ts'

/** Thrown for any envelope or profile-shape violation. */
export class BearingValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'BearingValidationError'
  }
}

// v2 envelope: `audience` (v1) is gone — it is no longer listed, so the strict
// allow-list below rejects any bearing that still carries it, naming the key.
// `client` is new and optional; `source` is optional (validated when present).
const ENVELOPE_KEYS = ['bearing', 'name', 'version', 'profile', 'source', 'client'] as const

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

function requireStringArray(value: unknown, ctx: string): string[] {
  if (!Array.isArray(value) || !value.every((x) => typeof x === 'string')) {
    fail(`${ctx}: must be an array of strings`)
  }
  return value as string[]
}

/** Validate the envelope shared by every bearing, then dispatch on profile. */
export function parseBearing(yamlText: string): Bearing {
  const raw: unknown = parseYaml(yamlText)
  if (!isPlainObject(raw)) fail('bearing must be a YAML mapping at the top level')

  // --- Shared envelope ---
  const bearing = requireString(raw, 'bearing', 'envelope')
  const ctx = `bearing "${bearing}"`
  const name = requireString(raw, 'name', ctx)

  if (typeof raw.version !== 'number' || !Number.isInteger(raw.version)) {
    fail(`${ctx}: "version" must be an integer`)
  }
  const version = raw.version

  const profileRaw = raw.profile
  if (typeof profileRaw !== 'string' || !PROFILES.includes(profileRaw as BearingProfile)) {
    fail(`${ctx}: "profile" must be one of ${PROFILES.join(' | ')} (got ${JSON.stringify(profileRaw)})`)
  }
  const profile = profileRaw as BearingProfile

  const envelope: BearingEnvelope = { bearing, name, version, profile }

  // `source` is optional in v2, but a non-empty array of strings when present.
  if (raw.source !== undefined) {
    const source = requireArray(raw, 'source', ctx)
    if (source.length === 0 || !source.every((s) => typeof s === 'string')) {
      fail(`${ctx}: "source" must be a non-empty array of strings`)
    }
    envelope.source = source as string[]
  }

  // `client` is optional; a non-empty string when present.
  if (raw.client !== undefined) {
    envelope.client = requireString(raw, 'client', ctx)
  }

  // --- Profile dispatch: strict top-level allow-list ---
  // Any key that is neither part of the envelope nor allowed for the declared
  // profile is a validation error. This is what catches a `gate` in a standing
  // bearing or a `cadence` in a journey bearing instead of silently ignoring it.
  const allowed = new Set<string>([...ENVELOPE_KEYS, ...PROFILE_KEYS[profile]])
  for (const key of Object.keys(raw)) {
    if (!allowed.has(key)) {
      fail(
        `${ctx}: key "${key}" is not valid for profile "${profile}" ` +
          `(allowed: ${[...allowed].join(', ')})`,
      )
    }
  }

  return profile === 'journey'
    ? validateJourney(raw, ctx, envelope)
    : validateStanding(raw, ctx, envelope)
}

// --- Journey validation ------------------------------------------------------

function validateJourney(raw: Dict, ctx: string, envelope: BearingEnvelope): JourneyBearing {
  const stagesRaw = requireArray(raw, 'stages', ctx)
  if (stagesRaw.length === 0) fail(`${ctx}: "stages" must not be empty`)

  const stages = stagesRaw.map((s, i) => validateStage(s, `${ctx} stages[${i}]`))

  // Stage ids must be unique — a duplicate makes `unlocks` ambiguous, and the
  // gating graph is now the primary mechanism rather than a documented intent.
  // (Referential integrity of `unlocks` — that it names ids in the bearing set
  // — is deferred to M2, which has the whole set; recorded as a known gap.)
  const seen = new Set<string>()
  for (const stage of stages) {
    if (seen.has(stage.id)) fail(`${ctx}: duplicate stage id "${stage.id}"`)
    seen.add(stage.id)
  }

  const result: JourneyBearing = { ...envelope, profile: 'journey', stages }
  if (raw.mode !== undefined) {
    result.mode = requireStringArray(raw.mode, `${ctx}: "mode"`)
  }
  return result
}

function validateStage(s: unknown, sctx: string): JourneyStage {
  if (!isPlainObject(s)) fail(`${sctx}: must be a mapping`)

  const stage: JourneyStage = {
    id: requireString(s, 'id', sctx),
    title: requireString(s, 'title', sctx),
    prompt: requireString(s, 'prompt', sctx),
    gate: validateGate(s.gate, sctx),
  }
  if (s.artifact !== undefined) stage.artifact = requireString(s, 'artifact', sctx)
  if (s.unlocks !== undefined) stage.unlocks = requireStringArray(s.unlocks, `${sctx}: "unlocks"`)
  if (s.scoring !== undefined) stage.scoring = validateScoring(s.scoring, sctx)
  return stage
}

function validateGate(gate: unknown, sctx: string): JourneyStageGate {
  if (!isPlainObject(gate)) fail(`${sctx}: "gate" must be a mapping`)

  const result: JourneyStageGate = { rule: requireString(gate, 'rule', `${sctx}.gate`) }
  const rs = gate.requires_signoff
  if (rs !== undefined) {
    if (typeof rs !== 'boolean') fail(`${sctx}.gate: "requires_signoff" must be a boolean`)
    result.requires_signoff = rs
  }
  return result
}

function validateScoring(scoring: unknown, sctx: string): JourneyStageScoring {
  if (!isPlainObject(scoring)) fail(`${sctx}: "scoring" must be a mapping`)
  const dimensions = requireStringArray(scoring.dimensions, `${sctx}.scoring: "dimensions"`)
  if (dimensions.length === 0) {
    fail(`${sctx}.scoring: "dimensions" must be a non-empty array of strings`)
  }
  return { dimensions }
}

// --- Standing validation -----------------------------------------------------

const TIERS: readonly TargetTier[] = ['A', 'B', 'C']

function validateStanding(raw: Dict, ctx: string, envelope: BearingEnvelope): StandingBearing {
  const targets = requireArray(raw, 'targets', ctx).map((t, i) =>
    validateTarget(t, `${ctx} targets[${i}]`),
  )
  const rhythms = requireArray(raw, 'rhythms', ctx).map((r, i) =>
    validateRhythm(r, `${ctx} rhythms[${i}]`),
  )
  const initiatives = requireArray(raw, 'initiatives', ctx).map((it, i) =>
    validateInitiative(it, `${ctx} initiatives[${i}]`),
  )
  return { ...envelope, profile: 'standing', targets, rhythms, initiatives }
}

function validateTarget(t: unknown, tctx: string): Target {
  if (!isPlainObject(t)) fail(`${tctx}: must be a mapping`)
  const id = requireString(t, 'id', tctx)
  const label = requireString(t, 'label', tctx)

  const rawTarget = t.target
  if (
    !isPlainObject(rawTarget) ||
    typeof rawTarget.value !== 'number' ||
    typeof rawTarget.unit !== 'string'
  ) {
    fail(`${tctx}: "target" must have a numeric "value" and a string "unit"`)
  }
  const target: TargetValue = { value: rawTarget.value, unit: rawTarget.unit }
  if (rawTarget.period !== undefined) {
    target.period = requireString(rawTarget, 'period', `${tctx}.target`)
  }

  const rawActual = t.actual
  if (!isPlainObject(rawActual)) fail(`${tctx}: "actual" must be a mapping`)
  const actual: TargetActual = { source: requireString(rawActual, 'source', `${tctx}.actual`) }
  if (rawActual.goal_tool !== undefined) {
    actual.goal_tool = requireString(rawActual, 'goal_tool', `${tctx}.actual`)
  }
  if (rawActual.actual_tool !== undefined) {
    actual.actual_tool = requireString(rawActual, 'actual_tool', `${tctx}.actual`)
  }

  if (typeof t.tier !== 'string' || !TIERS.includes(t.tier as TargetTier)) {
    fail(`${tctx}: "tier" must be one of ${TIERS.join(' | ')}`)
  }
  if (typeof t.confirmed !== 'boolean') {
    fail(`${tctx}: "confirmed" must be a boolean`)
  }

  // `direction` (SAV-121): optional in the source, materialised to `gte` when
  // absent so consumers never re-implement the default. This is the one field
  // whose absent-optional is filled rather than omitted.
  let direction: TargetDirection = 'gte'
  if (t.direction !== undefined) {
    if (t.direction !== 'gte' && t.direction !== 'lte') {
      fail(`${tctx}: "direction" must be gte | lte`)
    }
    direction = t.direction
  }

  return { id, label, target, actual, tier: t.tier as TargetTier, direction, confirmed: t.confirmed }
}

// Each cadence has exactly one valid reset anchor (SAV-121); all are local to
// the consumer. Previously `reset` accepted any string.
const CADENCE_ANCHORS: Record<RhythmCadence, string> = {
  weekly: 'monday',
  monthly: 'first',
  daily: 'local-day',
}

function validateRhythm(r: unknown, rctx: string): Rhythm {
  if (!isPlainObject(r)) fail(`${rctx}: must be a mapping`)
  const id = requireString(r, 'id', rctx)
  const label = requireString(r, 'label', rctx)

  const cadence = r.cadence
  if (cadence !== 'weekly' && cadence !== 'monthly' && cadence !== 'daily') {
    fail(`${rctx}: "cadence" must be weekly | monthly | daily`)
  }
  const reset = requireString(r, 'reset', rctx)
  const expectedAnchor = CADENCE_ANCHORS[cadence]
  if (reset !== expectedAnchor) {
    fail(`${rctx}: "reset" must be "${expectedAnchor}" for cadence "${cadence}"`)
  }

  const result: Rhythm = { id, label, cadence, reset }
  if (r.count !== undefined) {
    if (typeof r.count !== 'number') fail(`${rctx}: "count" must be a number`)
    result.count = r.count
  }
  return result
}

function validateInitiative(it: unknown, ictx: string): Initiative {
  if (!isPlainObject(it)) fail(`${ictx}: must be a mapping`)
  const id = requireString(it, 'id', ictx)
  const label = requireString(it, 'label', ictx)

  const milestones = requireArray(it, 'milestones', ictx).map((m, j) => {
    const mctx = `${ictx} milestones[${j}]`
    if (!isPlainObject(m)) fail(`${mctx}: must be a mapping`)
    return { id: requireString(m, 'id', mctx), label: requireString(m, 'label', mctx) }
  })
  return { id, label, milestones }
}
