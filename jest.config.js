module.exports = {
  clearMocks: true,
  moduleNameMapper: {
    '\\.code(\\.js)?': '<rootDir>/tests/stub.code.js',
  },
  modulePathIgnorePatterns: ['.+/fixtures/dest'],
  preset: 'ts-jest',
  setupFilesAfterEnv: ['./tests/jest.setup.js'],
  transform: {
    '.(js|jsx|ts|tsx)': '@sucrase/jest-plugin',
  },
  transformIgnorePatterns: [
    '<rootDir>/node_modules/(?!lodash-es/.*)',
  ],
}
