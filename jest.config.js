// const esModules = ['lodash-es'].map((x) => `(${x})`).join('|')

module.exports = {
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/manifest-input/browser/**/*',
    '!src/simple-reloader/client/**/*',
  ],
  coverageReporters: ['json-summary', 'text', 'lcov'],
  moduleNameMapper: {
    'code .+': '<rootDir>/test/data/bundle-imports-stub.ts',
    '^\\$src(.+)$': '<rootDir>/src$1',
    '^\\$src$': '<rootDir>/src/index.ts',
    '^\\$test(.+)$': '<rootDir>/test$1',
  },
  modulePathIgnorePatterns: ['~~.+', '__fixtures__', 'client'],
  reporters: ['default'],
  setupFilesAfterEnv: ['./jest.setup.ts'],
  testRunner: 'jest-circus/runner',
  transform: {
    '\\.[tj]sx?$': 'esbuild-runner/jest',
  },
  // For PNPM users, need to add '.*' to get the last instance of the ignored module
  // transformIgnorePatterns: [`node_modules/(?!.*${esModules})`],
}
