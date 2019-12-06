module.exports = {
  env: {
    browser: true,
    serviceworker: true,
    node: false,
  },
  parserOptions: {
    ecmaVersion: 2018,
    sourceType: 'module',
    project: './tsconfig.json',
    tsconfigRootDir: __dirname,
  },
}
