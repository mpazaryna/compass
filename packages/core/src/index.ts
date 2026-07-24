// @savvy/compass — bearing-driven conversation engine
// Bearings live in /os/web/bearings/*.yaml
//
// This entry point exposes the bearing loader/validator (SAV-116). The full
// journey conversation engine is a later milestone (M2) and is intentionally
// not built here — this is just the loader the settled schema (SAV-77) needs.

export { loadBearing, parseBearing, BearingValidationError } from './loader.ts'
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
