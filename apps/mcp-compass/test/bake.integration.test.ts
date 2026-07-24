import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { loadBearing } from '@compass/core'

const here = dirname(fileURLToPath(import.meta.url))
const app = resolve(here, '..')
const fixtures = resolve(app, '../../packages/core/src/fixtures')

describe('build-bearings bake (real filesystem)', () => {
  it('bakes parsed objects that deep-equal loadBearing of the same fixtures', async () => {
    // pnpm bake ran via test:integration; import the generated module.
    const { BEARINGS } = await import(resolve(app, 'src/bearings.generated.ts'))
    const expected = [
      loadBearing(resolve(fixtures, 'journey-example.yaml')),
      loadBearing(resolve(fixtures, 'standing-example.yaml')),
    ]
    expect(BEARINGS).toEqual(expected)
  })

  it('fails the build on a malformed bearing', () => {
    let threw = false
    let stderr = ''
    try {
      execFileSync('node', ['scripts/build-bearings.mjs'], {
        cwd: app,
        env: { ...process.env, COMPASS_BEARINGS_DIR: resolve(here, 'fixtures-bad') },
        stdio: 'pipe',
      })
    } catch (e) {
      threw = true
      stderr = String((e as { stderr?: Buffer }).stderr ?? '')
    }
    expect(threw).toBe(true)
    expect(stderr).toMatch(/name/)
  })

  it('ships no YAML parser to the Worker — index.ts and tools.ts', () => {
    const index = readFileSync(resolve(app, 'src/index.ts'), 'utf8')
    const tools = readFileSync(resolve(app, 'src/tools.ts'), 'utf8')
    // Import-specific — a comment that names the forbidden module is fine; a
    // runtime import is not (the same distinction as M1's node-import guard).
    for (const src of [index, tools]) {
      expect(src).not.toMatch(/\bfrom\s+['"]yaml['"]/)
      expect(src).not.toMatch(/\bfrom\s+['"]@compass\/core\/parse['"]/)
      expect(src).not.toMatch(/\bfrom\s+['"]node:/)
    }
  })
})
