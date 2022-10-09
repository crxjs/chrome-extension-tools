import { defineConfig, configDefaults } from 'vitest/config'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
console.log(__dirname)

export default defineConfig({
  test: {
    exclude: ['**/e2e/**', '**/templates/**', '**/node_modules/**'],
    globalSetup: './tests/jest.globalSetup.ts',
    setupFiles: './tests/jest.setup.ts',
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
    watchExclude: [...configDefaults.watchExclude, '**/tests/templates'],
    testTimeout: process.env.TIMEOUT ? parseInt(process.env.TIMEOUT) : 30000,
  },
})
