// TODO: if process.env.CI, build for production and test against the build
// - add global setup file to build
// - update moduleNameMapper to point $src to pkg.main

const esModules = ['read-pkg'].map((x) => `(${x})`).join('|')

const { readdirSync } = require('fs')
const { join } = require('path')

module.exports = {
  // For PNPM users, need to add '.*' to get the last instance of the ignored module
  transformIgnorePatterns: [`node_modules/(?!.*${esModules})`],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/manifest-input/browser/**/*',
    '!src/simple-reloader/client/**/*',
  ],
  coverageReporters: ['json-summary', 'text', 'lcov'],
  globalSetup: './jest.globalSetup.ts',
  moduleNameMapper: {
    // aliases
    '^\\$src(.+)$': '<rootDir>/src$1',
    '^\\$src$': '<rootDir>/src/index.ts',
    '^\\$test(.+)$': '<rootDir>/test$1',
    // bundled imports
    ...Object.fromEntries(
      readdirSync(join(__dirname, 'src', 'browser'))
        .filter((filename) => filename.startsWith('code-'))
        .map((filename) => [
          `code ./browser/${filename}`,
          `<rootDir>/test/fixtures/${
            filename.slice(0, -2) + 'js'
          }`,
        ]),
    ),
    ...Object.fromEntries(
      readdirSync(join(__dirname, 'src', 'service-worker'))
        .filter((filename) => filename.startsWith('code-'))
        .map((filename) => [
          `code ./service-worker/${filename}`,
          `<rootDir>/test/fixtures/${
            filename.slice(0, -2) + 'js'
          }`,
        ]),
    ),
  },
  reporters: ['default'],
  setupFilesAfterEnv: ['./jest.setup.ts'],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/playground/',
    '/dist/',
  ],
  transform: {
    '\\.[tj]sx?$': 'esbuild-runner/jest',
  },
  watchPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/test/.+?dist',
  ],
}
