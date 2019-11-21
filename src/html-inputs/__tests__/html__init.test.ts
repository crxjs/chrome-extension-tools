import htmlInputs from '../index'

const plugin = htmlInputs({ srcDir: 'src' })

test('returns correct plugin', () => {
  expect(plugin).toMatchObject({
    name: 'html-inputs',
    options: expect.any(Function),
    buildStart: expect.any(Function),
    watchChange: expect.any(Function),
  })
})
