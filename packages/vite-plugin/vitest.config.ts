import { defineConfig } from 'vitest/config'
import path from 'pathe'
import { chromium } from 'playwright-chromium'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
console.log(__dirname)

export default defineConfig(({ mode }) => {
  const exclude =
    mode === 'e2e'
      ? ['**/src/**', '**/compat/**', '**/out/**'] // exclude non-e2e tests
      : mode === 'out'
      ? ['**/compat/**', '**/e2e/**'] // exclude non-output tests
      : mode === 'compat'
      ? ['**/e2e/**', '**/out/**', '**/src/**'] // exclude non-compat tests
      : [] // for running any individual test

  const testTimeout = process.env.TIMEOUT
    ? parseInt(process.env.TIMEOUT)
    : 60000

  return {
    server: { watch: { ignored: ['**/tests/templates/**'] } },
    test: {
      expect: { poll: { timeout: 15_000 } },
      environment: mode === 'e2e' ? 'web-ext' : 'node',
      environmentMatchGlobs: [['**/tests/e2e/**', 'web-ext']],
      environmentOptions: {
        'web-ext': {
          path: '.',
          autoLaunch: false,
          detectExtensionId: false,
          playwright: {
            browser:
              process.env.E2E_BROWSER === 'firefox' ? 'firefox' : 'chromium',
            headless: !process.env.DEBUG,
            slowMo: process.env.DEBUG ? 100 : 0,
            // Keep the existing Chromium revision independent of Firefox's driver.
            executablePath:
              process.env.E2E_BROWSER === 'firefox'
                ? ''
                : chromium.executablePath(),
          },
        },
      },
      ...(process.env.OUTPUT_BROWSER === 'firefox'
        ? { include: ['tests/out/**/*.test.ts'] }
        : {}),
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
      resolveSnapshotPath(testPath, extension) {
        const suffix =
          process.env.OUTPUT_BROWSER === 'firefox' &&
          testPath.includes(`${path.sep}out${path.sep}`)
            ? '-firefox'
            : ''
        return path.join(
          path.dirname(testPath),
          '__snapshots__',
          `${path.basename(testPath)}${suffix}${extension}`,
        )
      },
      globalSetup: './tests/jest.globalSetup.ts',
      pool: 'forks',
      fileParallelism: mode !== 'e2e',
      setupFiles: './tests/jest.setup.ts',
      snapshotFormat: {
        escapeString: true,
        printBasicPrototype: true,
      },
      testTimeout,
      chaiConfig: { includeStack: false, showDiff: true, truncateThreshold: 0 },
    },
  }
})
