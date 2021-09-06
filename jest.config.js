// TODO: if process.env.CI, build for production and test against the build
// - add global setup file to build
// - update moduleNameMapper to point $src to pkg.main
module.exports = {
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/manifest-input/browser/**/*',
    '!src/simple-reloader/client/**/*',
  ],
  coverageReporters: ['json-summary', 'text', 'lcov'],
  moduleNameMapper: {
    // aliases
    '^\\$src(.+)$': '<rootDir>/src$1',
    '^\\$src$': '<rootDir>/src/index.ts',
    '^\\$test(.+)$': '<rootDir>/test$1',
    // bundle imports
    'code ./browser/contentScriptWrapper.ts':
      '<rootDir>/test/fixtures/dist/contentScriptWrapper.js',
    'code ./browser/executeScriptPolyfill.ts':
      '<rootDir>/test/fixtures/dist/executeScriptPolyfill.js',
    'code ./browser/importWrapper--explicit.ts':
      '<rootDir>/test/fixtures/dist/importWrapper--explicit.js',
    'code ./browser/importWrapper--implicit.ts':
      '<rootDir>/test/fixtures/dist/importWrapper--implicit.js',
    'code ./client/background.ts':
      '<rootDir>/test/fixtures/dist/reloaderBackground.js',
    'code ./client/content.ts':
      '<rootDir>/test/fixtures/dist/reloaderContent.js',
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
