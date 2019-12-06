import { simpleReloader } from '..'

test('creates correct plugin', () => {
  process.env.ROLLUP_WATCH = 'true'

  const reloader = simpleReloader()

  expect(reloader).toEqual({
    name: 'chrome-extension-simple-reloader',
    generateBundle: expect.any(Function),
  })
})

test('returns undefined if not in watch mode', () => {
  delete process.env.ROLLUP_WATCH

  const reloader = simpleReloader()

  expect(reloader).toBeUndefined()
})
