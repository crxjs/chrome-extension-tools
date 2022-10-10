import { PluginOption, UserConfig } from 'vite'
import { ManifestV3Export } from './defineManifest'
import { CrxOptions, CrxPlugin } from './types'

export type CrxInputOptions = { manifest: ManifestV3Export } & CrxOptions

const pluginName = 'crx:optionsProvider'
export const pluginOptionsProvider = (options: CrxInputOptions | null) => {
  return {
    name: pluginName,
    api: {
      crx: {
        // during testing this can be null, we don't provide options through the test config
        options,
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any,
  }
}

/**
 * CRXJS uses an options provider instead of a plugin function closure.
 *
 * Vite 3 self-compiles the Vite config file, which breaks debugging during
 * CRXJS tests. To support debugging, CRXJS uses a test options plugin in test
 * files and defines the real CRXJS plugin during test setup.
 *
 * The test options provider overrides the default options before the config
 * hook; options should be declared during the config hook.
 */
export const getOptions = ({ plugins }: UserConfig): CrxInputOptions => {
  if (typeof plugins === 'undefined') {
    throw new Error('config.plugins is undefined')
  }

  let options: CrxInputOptions | undefined
  for (const p of plugins.flat()) {
    if (isCrxPlugin(p))
      if (p.name === pluginName) {
        const plugin = p as ReturnType<typeof pluginOptionsProvider>
        options = plugin.api.crx.options
        if (options) break
      }
  }

  if (typeof options === 'undefined') {
    throw Error('Unable to get CRXJS options')
  }

  // TODO: define defaults here
  return options
}

function isCrxPlugin(p: PluginOption): p is CrxPlugin {
  return (
    !!p &&
    typeof p === 'object' &&
    !(p instanceof Promise) &&
    !Array.isArray(p) &&
    p.name.startsWith('crx:')
  )
}
