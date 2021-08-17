// const esModules = ['lodash-es'].map((x) => `(${x})`).join('|')

module.exports = {
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/manifest-input/browser/**/*',
    '!src/simple-reloader/client/**/*',
  ],
  coverageReporters: ['json-summary', 'text', 'lcov'],
  moduleNameMapper: {
    'code .+': '<rootDir>/__fixtures__/bundle-imports-stub.ts',
  },
  modulePathIgnorePatterns: ['~~.+', '__fixtures__', 'client'],
  preset: 'ts-jest',
  reporters: ['default'],
  setupFilesAfterEnv: ['./jest.setup.ts'],
  testRunner: 'jest-circus/runner',
  transform: {
    // Use Sucrase to convert ES6 modules in JS files
    '.(js|jsx)': '@sucrase/jest-plugin',
  },
  // For PNPM users, need to add '.*' to get the last instance of the ignored module
  // transformIgnorePatterns: [`node_modules/(?!.*${esModules})`],
}
