import {
  OutputBundle,
  rollup,
  RollupOptions,
  RollupOutput,
} from 'rollup'
import { chromeExtension } from '..'
import { context as minimal } from '../../__fixtures__/minimal-plugin-context'
import { context } from '../../__fixtures__/plugin-context'
import { requireExtFile } from '../../__fixtures__/utils'

/* ------------------ SETUP TESTS ------------------ */

const config = requireExtFile<RollupOptions>(
  'basic',
  'rollup.config.js',
)

let bundlePromise: Promise<OutputBundle>
let outputPromise: Promise<RollupOutput>
beforeAll(async () => {
  config.plugins!.push({
    name: 'save-bundle',
    generateBundle(o, b) {
      bundlePromise = Promise.resolve(b)
    },
  })

  outputPromise = rollup(config).then((bundle) =>
    bundle.generate(config.output as any),
  )

  return outputPromise
}, 15000)

const { _plugins, ...plugin } = chromeExtension({
  verbose: false,
})

jest.spyOn(_plugins.manifest, 'generateBundle')
jest.spyOn(_plugins.validate, 'generateBundle')

test('calls manifest, and validate hooks', async () => {
  const bundle = await bundlePromise
  const options = plugin.options.call(minimal, config) || config
  await plugin.buildStart.call(context, options)
  await plugin.generateBundle.call(
    context,
    options,
    bundle,
    false,
  )

  expect(_plugins.manifest.generateBundle).toBeCalled()
  expect(_plugins.validate.generateBundle).toBeCalled()
})
