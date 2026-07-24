import { defineConfig } from 'vitest/config'

// Default suite: unit tests only (pure handleTool). No baked module, no runtime.
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
  },
})
