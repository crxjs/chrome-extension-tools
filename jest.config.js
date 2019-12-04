module.exports = {
  coverageReporters: ['json-summary', 'text', 'lcov'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/push-reloader/sw/**/*',
    '!src/manifest-input/browser/**/*',
    '!src/push-reloader/client/**/*',
    '!src/simple-reloader/client/**/*',
  ],
  moduleNameMapper: {
    'code .+': '<rootDir>/__fixtures__/bundle-imports-stub.ts',
  },
  modulePathIgnorePatterns: ['~~.+'],
  preset: 'ts-jest',
  setupFilesAfterEnv: ['./jest.setup.ts'],
  transform: {
    // Use Sucrase to convert ES6 modules in JS files
    '.(js|jsx)': '@sucrase/jest-plugin',
  },
  transformIgnorePatterns: [
    '<rootDir>/node_modules/(?!lodash-es/.*)',
  ],
}
