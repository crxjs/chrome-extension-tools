import { simpleReloader } from '..'

test('creates correct plugin', () => {
  const reloader = simpleReloader()

  expect(reloader).toEqual({
    name: 'simple-reloader',
    generateBundle: expect.any(Function),
  })
})
