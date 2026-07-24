// @compass/core — bearing loader + validator
//
// This entry point exposes the bearing parser/validator (SAV-116). The pure
// parser (`parse.ts`) carries no `node:` import so a Worker can use it directly;
// the filesystem reader (`load.ts`) is Node-only. The full journey conversation
// engine is a later milestone (M2) — this is just the loader the settled schema
// (SAV-77) needs.

export { parseBearing, BearingValidationError } from './parse.ts'
export { loadBearing } from './load.ts'
export type {
  Bearing,
  BearingEnvelope,
  BearingProfile,
  JourneyBearing,
  JourneyStage,
  JourneyStageGate,
  JourneyStageScoring,
  StandingBearing,
  Target,
  TargetActual,
  TargetTier,
  TargetValue,
  Rhythm,
  RhythmCadence,
  Initiative,
  InitiativeMilestone,
} from './types.ts'
