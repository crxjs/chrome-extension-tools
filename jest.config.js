module.exports = {
  coverageReporters: ['json-summary', 'text', 'lcov'],
  moduleNameMapper: {
    'code .+': '<rootDir>/__fixtures__/bundle-imports-stub.ts',
  },
  modulePathIgnorePatterns: ['~~.+'],
  preset: 'ts-jest',
  setupFilesAfterEnv: ['./jest.setup.ts'],
  transform: {
    // Not really sure what Sucrase does here,
    // but Jest can't read the files without it.
    '.(js|jsx)': '@sucrase/jest-plugin',
  },
  transformIgnorePatterns: [
    '<rootDir>/node_modules/(?!lodash-es/.*)',
  ],
}
