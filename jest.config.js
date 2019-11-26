module.exports = {
  moduleNameMapper: {
    'code .+': '<rootDir>/__fixtures__/bundle-imports-stub.ts',
  },
  modulePathIgnorePatterns: [
    '~~.+',
    'push-reloader',
    'simple-reloader',
  ],
  preset: 'ts-jest',
  setupFilesAfterEnv: ['./jest.setup.ts'],
  transform: {
    // Not really sure what Sucrase does here,
    // but Jest can't read the files without it.
    '.(js|jsx|ts|tsx)': '@sucrase/jest-plugin',
  },
  transformIgnorePatterns: [
    '<rootDir>/node_modules/(?!lodash-es/.*)',
  ],
}
