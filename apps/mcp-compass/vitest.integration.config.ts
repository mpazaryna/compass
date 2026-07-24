import { defineConfig } from 'vitest/config'

// Integration: real boundaries — the bake against the real filesystem, and the
// real fetch handler exercised with real Request/Response (no mocks at the seam).
// The workerd runtime itself is covered by the E2E tier against `wrangler dev`.
export default defineConfig({
  test: {
    include: ['test/**/*.integration.test.ts'],
  },
})
