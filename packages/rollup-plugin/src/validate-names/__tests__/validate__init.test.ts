import { validateNames } from '../index'

test('returns object with name & generatedBundle', () => {
  const plugin = validateNames()

  expect(plugin).toEqual({
    name: 'validate-names',
    generateBundle: expect.any(Function),
  })
})
