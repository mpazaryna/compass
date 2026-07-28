import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { loadBearing } from '@compass/core'

const here = dirname(fileURLToPath(import.meta.url))
const app = resolve(here, '..')
// Authored bearings live at the REPO ROOT, not inside the app — one folder per
// bearing, `bearings/<slug>/bearing.yaml` (SHE-18). Mirrors Orchestra's
// top-level `skills/<name>/`.
const bearingsDir = resolve(app, '../../bearings')

describe('build-bearings bake (real filesystem)', () => {
  it('bakes parsed objects that deep-equal loadBearing of the served bearing set', async () => {
    // pnpm bake ran via test:integration; import the generated module.
    const { BEARINGS } = await import(resolve(app, 'src/bearings.generated.ts'))
    const expected = [loadBearing(resolve(bearingsDir, 'brand-builder', 'bearing.yaml'))]
    expect(BEARINGS).toEqual(expected)
  })

  it('serves the real Brand Builder — two stages, the unlocks hand-off, real prompts', async () => {
    const { BEARINGS } = await import(resolve(app, 'src/bearings.generated.ts'))
    const bb = BEARINGS.find((b: { bearing: string }) => b.bearing === 'brand-builder')
    expect(bb.stages.map((s: { id: string }) => s.id)).toEqual(['discovery', 'foundation'])
    expect(bb.stages[0].unlocks).toContain('foundation')
    for (const stage of bb.stages) {
      // Real content, not the M1 placeholder ellipsis.
      expect(stage.prompt).not.toMatch(/…|\.\.\./)
      expect(stage.prompt.length).toBeGreaterThan(60)
    }
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
