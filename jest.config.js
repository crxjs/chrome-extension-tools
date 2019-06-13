module.exports = {
  clearMocks: true,
  moduleNameMapper: {
    '\\.code(\\.js)?': '<rootDir>/tests/stub.code.js',
  },
  modulePathIgnorePatterns: ['fixtures/dest'],
  projects: ['<rootDir>', '<rootDir>/reloader/push/functions'],
  setupFilesAfterEnv: ['./tests/jest.setup.js'],
  testPathIgnorePatterns: [
    '<rootDir>/reloader/push/functions',
    '<rootDir>/node_modules/',
  ],
  transform: {
    '.(js|jsx|ts|tsx)': '@sucrase/jest-plugin',
  },
}
