module.exports = {
  moduleNameMapper: {
    '\\.code(\\.js)?': '<rootDir>/tests/stub.code.js',
  },
  modulePathIgnorePatterns: ['.+/fixtures/dest', 'old-tests'],
  preset: 'ts-jest',
  setupFilesAfterEnv: ['./jest.setup.js'],
  transform: {
    // Not really sure what Sucrase does here,
    // but Jest can't read the files without it.
    '.(js|jsx|ts|tsx)': '@sucrase/jest-plugin',
  },
  transformIgnorePatterns: [
    '<rootDir>/node_modules/(?!lodash-es/.*)',
  ],
}
