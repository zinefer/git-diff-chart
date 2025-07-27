import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    coverage: {
      include: [
        'src/**/*.ts',
      ],

      exclude: [
        'node_modules/**',
        'src/commands/**',
        'src/cli.ts',
        'src/index.ts',
        'coverage/**'
      ],
    },
  }
});