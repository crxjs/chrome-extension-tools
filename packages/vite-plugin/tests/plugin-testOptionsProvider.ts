import {
  pluginOptionsProvider,
  CrxInputOptions,
} from '../src/node/plugin-optionsProvider'

export const crx = (options: CrxInputOptions) => {
  if (process.env.E2E_BROWSER !== 'firefox')
    return pluginOptionsProvider(options)
  // Keep the same fixtures, adapting only the browser-specific manifest format.
  const original = options.manifest
  return pluginOptionsProvider({
    ...options,
    browser: 'firefox',
    manifest: async (env) => {
      const manifest =
        typeof original === 'function' ? await original(env) : await original
      const background = manifest.background
      return {
        ...manifest,
        browser_specific_settings: { gecko: { id: 'e2e@crxjs.test' } },
        ...(background && 'service_worker' in background
          ? {
              background: {
                scripts: [background.service_worker],
                type: 'module',
              },
            }
          : {}),
      }
    },
  })
}
export {
  defineManifest,
  defineDynamicResource,
} from '../src/node/defineManifest'
