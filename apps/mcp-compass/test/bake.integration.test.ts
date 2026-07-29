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

  // Run the real bake as a subprocess against a fixture root. Returns whether it
  // failed and what it said — the message is the authoring interface, so every
  // negative test below asserts on the wording, not merely that it threw.
  const bakeAgainst = (fixture: string): { threw: boolean; stderr: string } => {
    try {
      execFileSync('node', ['scripts/build-bearings.mjs'], {
        cwd: app,
        env: { ...process.env, COMPASS_BEARINGS_DIR: resolve(here, fixture) },
        stdio: 'pipe',
      })
      return { threw: false, stderr: '' }
    } catch (e) {
      return { threw: true, stderr: String((e as { stderr?: Buffer }).stderr ?? '') }
    }
  }

  it('fails the build on a malformed bearing', () => {
    const { threw, stderr } = bakeAgainst('fixtures-bad')
    expect(threw).toBe(true)
    expect(stderr).toMatch(/name/)
  })

  it('fails the build on a bearing home with no bearing.yaml', () => {
    const { threw, stderr } = bakeAgainst('fixtures-no-bearing')
    expect(threw).toBe(true)
    // Names the home that is wrong and the file that is missing, then says what
    // the shape should be — an author must not have to read the bake to fix it.
    expect(stderr).toMatch(/bearing home "brand-builder"/)
    expect(stderr).toMatch(/has no bearing\.yaml/)
    expect(stderr).toMatch(/each bearing is a directory containing bearing\.yaml/)
  })

  it('fails the build on a bearing left loose at the bearings root', () => {
    const { threw, stderr } = bakeAgainst('fixtures-loose')
    expect(threw).toBe(true)
    // Silently skipping it would serve a client one bearing short with nothing
    // to say so. Name the file and where it belongs.
    expect(stderr).toMatch(/"loose\.yaml" sits loose in the bearings directory/)
    expect(stderr).toMatch(/a bearing lives at <slug>\/bearing\.yaml/)
  })

  it('names every loose bearing at once, .yml as well as .yaml', () => {
    const { threw, stderr } = bakeAgainst('fixtures-loose-many')
    expect(threw).toBe(true)
    // Reporting one at a time makes an author rebuild to discover the next, and
    // a .yml typo is exactly as silent an omission as a misplaced .yaml.
    expect(stderr).toMatch(/"alpha\.yaml"/)
    expect(stderr).toMatch(/"beta\.yml"/)
    expect(stderr).toMatch(/sit loose in the bearings directory/)
  })

  it('does not mistake a dot-directory for a bearing home', () => {
    const { threw, stderr } = bakeAgainst('fixtures-dotdir')
    // `.cache` sorts before `brand-builder`, so whichever the bake complains
    // about tells us whether dot-directories are skipped. It must be the real
    // home — tooling debris is not an authoring mistake.
    expect(threw).toBe(true)
    expect(stderr).toMatch(/bearing home "brand-builder"/)
    expect(stderr).not.toMatch(/\.cache/)
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
