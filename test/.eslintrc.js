module.exports = {
  env: {
    browser: true,
    webextensions: true,
  },
  globals: {
    chrome: true,
  },
  extends: ['eslint:recommended', 'plugin:react/recommended'],
  overrides: [
    {
      files: ['**/*.test.ts'],
      env: {
        jest: true,
      },
    },
  ],
}
