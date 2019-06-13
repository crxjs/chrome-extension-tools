/* eslint-env node */

module.exports = (api) => {
  const isTest = api.env('test')

  const sourceMaps = isTest
    ? {
        sourceMaps: 'inline',
        retainLines: true,
      }
    : {}

  const presetTypescript = '@babel/preset-typescript'

  const presetEnv = (targets) => [
    '@babel/preset-env',
    { targets },
  ]

  const node = { node: '8.16' }

  return {
    ...sourceMaps,
    presets: [presetTypescript, presetEnv(node)],
    overrides: [
      {
        ...sourceMaps,
        test: './functions',
        presets: [presetTypescript, presetEnv(node)],
      },
    ],
  }
}
