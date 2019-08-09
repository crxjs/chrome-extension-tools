module.exports = {
  clearMocks: true,
  moduleNameMapper: {
    '\\.code(\\.js)?': '<rootDir>/tests/stub.code.js',
  },
  modulePathIgnorePatterns: ['.+/fixtures/dest'],
  setupFilesAfterEnv: ['./tests/jest.setup.js'],
  projects: ['<rootDir>', '<rootDir>/reloader/push/functions'],
  testPathIgnorePatterns: [
    '<rootDir>/reloader/push/functions',
    '<rootDir>/node_modules/',
  ],
  transform: {
    '.(js|jsx|ts|tsx)': '@sucrase/jest-plugin',
  },
}
