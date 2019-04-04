import { join } from 'path'
import { rollup } from 'rollup'

const fixture = name => join('tests/theories/fixtures/', name)

const plugin = {
  name: 'theories',
  options(opts) {
    return { ...opts, input: fixture('b.js') }
  },
  buildStart(opts) {
    opts.input = fixture('c.js')
  },
}

Object.keys(plugin).forEach(key => {
  if (typeof plugin[key] === 'string') return

  plugin[key] = jest.fn(plugin[key])
})

const config = {
  input: fixture('a.js'),
  output: {
    format: 'esm',
  },
  plugins: [plugin],
}

test('input options retain mutations', async () => {
  const bundle = await rollup(config)
  const { output } = await bundle.generate(config.output)

  const optionsResult = plugin.options.mock.results[0].value

  expect(plugin.options).not.toBeCalledWith(config)
  expect(plugin.buildStart).toBeCalledWith(optionsResult)

  expect(output).toContainObject({ fileName: 'c.js' })
})
