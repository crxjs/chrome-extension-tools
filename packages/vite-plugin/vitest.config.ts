import { defineConfig, configDefaults } from 'vitest/config'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
console.log(__dirname)

export default defineConfig(({ mode }) => {
  const isE2E = mode === 'e2e'
  const exclude = isE2E ? ['**/src/**', '**/mv3/**'] : ['**/e2e/**']
  return {
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
      exclude: [...exclude, '**/templates/**', '**/node_modules/**'],
      globalSetup: './tests/jest.globalSetup.ts',
      maxThreads: isE2E ? 1 : undefined,
      minThreads: isE2E ? 1 : undefined,
      setupFiles: './tests/jest.setup.ts',
      snapshotFormat: {
        printBasicPrototype: true,
      },
      testTimeout: process.env.TIMEOUT ? parseInt(process.env.TIMEOUT) : 30000,
      watchExclude: [...configDefaults.watchExclude, '**/tests/templates'],
    },
  }
})
