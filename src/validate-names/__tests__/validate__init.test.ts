import { validate } from '../index'

test('returns object with name & generatedBundle', () => {
  const plugin = validate()

  expect(plugin).toEqual({
    name: 'validate-names',
    generateBundle: expect.any(Function),
  })
})
