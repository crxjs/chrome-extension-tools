import { Plugin } from 'rollup'
import { chromeExtension } from '..'
import { ChromeExtensionPlugin } from '../plugin-options'

test('returns correct object', () => {
  const plugin = chromeExtension()

  expect(plugin).toEqual<ChromeExtensionPlugin>({
    name: 'chrome-extension',

    _plugins: expect.objectContaining({
      manifest: expect.objectContaining<Plugin>({
        name: 'manifest-input',
      }),
      html: expect.objectContaining<Plugin>({
        name: 'html-inputs',
      }),
      validate: expect.objectContaining<Plugin>({
        name: 'validate-names',
      }),
    }),

    options: expect.any(Function),
    buildStart: expect.any(Function),
    resolveId: expect.any(Function),
    load: expect.any(Function),
    watchChange: expect.any(Function),
    generateBundle: expect.any(Function),
  })
})
