// @savvy/compass — bearing types
// The bearing format is one vocabulary with two profiles (schema: SAV-77).
// A shared envelope + a `profile` discriminator (journey | standing).

/** The two bearing profiles. Journey = Compass runs it; standing = the tracker holds it. */
export type BearingProfile = 'journey' | 'standing'

/** Fields present on every bearing, regardless of profile. */
export interface BearingEnvelope {
  /** slug id — unique, kebab-case */
  bearing: string
  name: string
  /** consumers may pin; bump on breaking change */
  version: number
  profile: BearingProfile
  /** provenance — where the content was authored from (optional, non-empty when present) */
  source?: string[]
  /**
   * Client scope. Absent means universal methodology; present names the client
   * a bearing is scoped to. Nothing in M1 consumes it — M2's key-scoped serving
   * does. (v2: replaces v1's `audience` visibility gate.)
   */
  client?: string
}

// --- Profile: journey --------------------------------------------------------

export interface JourneyStageGate {
  rule: string
  requires_signoff?: boolean
}

export interface JourneyStageScoring {
  dimensions: string[]
}

export interface JourneyStage {
  id: string
  title: string
  prompt: string
  gate: JourneyStageGate
  artifact?: string
  /** gating dependency — the listed bearings/stages stay locked until this passes */
  unlocks?: string[]
  scoring?: JourneyStageScoring
}

export interface JourneyBearing extends BearingEnvelope {
  profile: 'journey'
  /** SAV-68's two postures, e.g. [build, extract] */
  mode?: string[]
  stages: JourneyStage[]
}

// --- Profile: standing -------------------------------------------------------

export type TargetTier = 'A' | 'B' | 'C'

export interface TargetValue {
  value: number
  unit: string
  period?: string
}

/**
 * Where a target's live value comes from. `source: none` means no backend yet
 * (Tier C — render target-only, labeled "no actuals"). Otherwise `source` names
 * the MCP server and the goal/actual tool refs the REST facade resolves.
 */
export interface TargetActual {
  source: string
  goal_tool?: string
  actual_tool?: string
}

export interface Target {
  id: string
  label: string
  target: TargetValue
  actual: TargetActual
  tier: TargetTier
  /** false while the value is [confirm with Sheri] */
  confirmed: boolean
}

export type RhythmCadence = 'weekly' | 'monthly'

export interface Rhythm {
  id: string
  label: string
  cadence: RhythmCadence
  /** optional target count per period */
  count?: number
  /** reset anchor: `monday` (ISO week) for weekly, `first` (calendar 1st) for monthly */
  reset: string
}

export interface InitiativeMilestone {
  id: string
  label: string
}

export interface Initiative {
  id: string
  label: string
  milestones: InitiativeMilestone[]
}

export interface StandingBearing extends BearingEnvelope {
  profile: 'standing'
  targets: Target[]
  rhythms: Rhythm[]
  initiatives: Initiative[]
}

// --- Union -------------------------------------------------------------------

export type Bearing = JourneyBearing | StandingBearing
