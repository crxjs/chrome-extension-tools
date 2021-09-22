// TODO: if process.env.CI, build for production and test against the build
// - add global setup file to build

const { readdirSync } = require('fs')
const { join } = require('path')

// - update moduleNameMapper to point $src to pkg.main
module.exports = {
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
      readdirSync(join(__dirname, 'test', 'fixtures'))
        .filter((filename) => filename.endsWith('.ts'))
        .map((filename) => [
          `code ./browser/${filename}`,
          `<rootDir>/test/fixtures/dist/${
            filename.slice(0, -2) + 'js'
          }`,
        ]),
    ),
  },
  reporters: ['default'],
  setupFilesAfterEnv: ['./jest.setup.ts'],
  testRunner: 'jest-circus/runner',
  transform: {
    '\\.[tj]sx?$': 'esbuild-runner/jest',
  },
  watchPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/test/.+?dist',
  ],
}

// For PNPM users, need to add '.*' to get the last instance of the ignored module
// const esModules = ['lodash-es'].map((x) => `(${x})`).join('|')
// transformIgnorePatterns: [`node_modules/(?!.*${esModules})`],
