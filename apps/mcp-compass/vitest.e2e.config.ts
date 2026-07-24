import { defineConfig } from 'vitest/config'

// E2E: the full connector handshake against a running Worker over real HTTP.
// Targets $COMPASS_MCP_URL, else http://localhost:8787 (a local `wrangler dev`).
export default defineConfig({
  test: {
    include: ['test/**/*.e2e.test.ts'],
  },
})
