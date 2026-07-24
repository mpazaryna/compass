// @compass/core — filesystem bearing reader (Node only)
// Reads a bearing YAML file from disk and delegates to the pure `parseBearing`.
// This is the ONLY module in the package that imports a `node:` builtin; a
// Worker imports `parse.ts` directly and never reaches this file.

import { readFileSync } from 'node:fs'
import { parseBearing, BearingValidationError } from './parse.ts'
import type { Bearing } from './types.ts'

/** Read a bearing YAML file from disk and parse it. */
export function loadBearing(filePath: string): Bearing {
  let text: string
  try {
    text = readFileSync(filePath, 'utf8')
  } catch (err) {
    throw new BearingValidationError(
      `could not read bearing file "${filePath}": ${(err as Error).message}`,
    )
  }
  return parseBearing(text)
}
