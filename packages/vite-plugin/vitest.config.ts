import { defineConfig, configDefaults } from 'vitest/config'
import path from 'pathe'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
console.log(__dirname)

export default defineConfig(({ mode }) => {
  const exclude =
    mode === 'e2e'
      ? ['**/src/**', '**/out/**'] // exclude non-e2e tests
      : mode === 'out'
      ? ['**/e2e/**'] // exclude e2e tests
      : [] // for running any individual test

  const testTimeout = process.env.TIMEOUT
    ? parseInt(process.env.TIMEOUT)
    : 60000

  return {
    expect: {
      timeout: 15_000,
    },
    test: {
      alias: [
        { find: 'src', replacement: path.resolve(__dirname, 'src/node') },
        { find: 'tests', replacement: path.resolve(__dirname, 'tests') },
        {
          find: /^client\/(.+)\.ts$/,
          replacement: `${path.resolve(__dirname, 'tests/artifacts')}/$1.js`,
        },
        {
          find: /^client\/(.+)\.html$/,
          replacement: `${path.resolve(__dirname, 'tests/artifacts')}/$1.js`,
        },
      ],
      exclude: [
        ...exclude,
        '**/templates/**',
        '**/node_modules/**',
        '**/dist*/**',
        '**/.vite/**',
      ],
      globalSetup: './tests/jest.globalSetup.ts',
      maxThreads: mode === 'e2e' ? 1 : undefined,
      minThreads: mode === 'e2e' ? 1 : undefined,
      setupFiles: './tests/jest.setup.ts',
      snapshotFormat: {
        printBasicPrototype: true,
      },
      testTimeout,
      watchExclude: [...configDefaults.watchExclude, '**/tests/templates'],
      chaiConfig: { includeStack: false, showDiff: true, truncateThreshold: 0 },
    },
  }
})
