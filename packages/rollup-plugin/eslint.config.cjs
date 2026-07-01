const { FlatCompat } = require('@eslint/eslintrc')
const js = require('@eslint/js')

const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all,
})

module.exports = [
  {
    ignores: [
      'node_modules/**',
      'lib/**',
      'types/**',
      'coverage/**',
      '**/*.js',
      'eslint.config.cjs',
      'rollup.config.js',
      'jest.config.js',
      '__fixtures__/**',
    ],
  },
  ...compat.config(require('./.eslintrc.js')),
]
