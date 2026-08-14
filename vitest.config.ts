import { defineConfig } from 'vitest/config'

// Own config so vitest does not inherit vite.config.ts's `root: 'demo'`.
export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
  },
})
