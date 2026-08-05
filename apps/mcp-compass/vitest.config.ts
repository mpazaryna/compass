import { defineConfig } from 'vitest/config'

// Default suite: unit tests only (pure handleTool, and the eval harness's pure
// layer). No baked module, no runtime, no API key — the journey eval itself is
// opt-in and lives behind `eval:journey`, but the logic deciding what its
// transcript records is ordinary code and is tested here.
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts', 'eval/**/*.test.ts'],
  },
})
