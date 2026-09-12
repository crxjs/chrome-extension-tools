const { FlatCompat } = require('@eslint/eslintrc')
const js = require('@eslint/js')

const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all,
})

module.exports = [
  {
    ignores: ['dist/**', 'node_modules/**', 'tests/**/dist-*/**', 'index.cjs'],
  },
  ...compat.config(require('./.eslintrc.cjs')),
  ...compat.config({
    overrides: [
      {
        files: ['tests/**/*.ts'],
        env: {
          jest: true,
          webextensions: true,
          serviceworker: true,
          browser: true,
        },
      },
    ],
  }),
]
