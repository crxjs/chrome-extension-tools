// const esModules = ['lodash-es'].map((x) => `(${x})`).join('|')

module.exports = {
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/manifest-input/browser/**/*',
    '!src/simple-reloader/client/**/*',
  ],
  coverageReporters: ['json-summary', 'text', 'lcov'],
  moduleNameMapper: {
    'code .+': '<rootDir>/helpers/bundle-imports-stub.ts',
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
