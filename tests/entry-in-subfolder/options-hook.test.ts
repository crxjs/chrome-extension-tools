import config from './rollup.config'

const { options } = config.plugins.find(({ name }) =>
  name.includes('chrome-extension'),
)

test('returns correct input object', async () => {
  expect(config).toBeDefined()
  expect(options).toBeDefined()

  const result = options.call({}, config)

  expect(result.input).toHaveProperty('scripts/background')
  expect(result.input).toHaveProperty('scripts/content')
  expect(result.input).toHaveProperty('scripts/options')
})

test('returns correct input object on second run', async () => {
  expect(config).toBeDefined()
  expect(options).toBeDefined()

  const result = options.call({}, config)

  expect(result.input).toHaveProperty('scripts/background')
  expect(result.input).toHaveProperty('scripts/content')
  expect(result.input).toHaveProperty('scripts/options')
})
