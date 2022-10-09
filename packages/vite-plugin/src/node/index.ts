import type { ManifestV3Export } from './defineManifest'
import { pluginFileWriter } from './plugin-fileWriter'
import { pluginHMR } from './plugin-hmr'
import { pluginHtmlInlineScripts } from './plugin-htmlInlineScripts'
import { pluginManifest } from './plugin-manifest'
import type { CrxOptions, CrxPlugin, CrxPluginFn } from './types'
import { pluginBackground } from './plugin-background'
import type { PluginOption } from 'vite'
import { pluginFileWriterPages } from './plugin-fileWriter--pages'

/** `init` initializes crx plugins with crx options */
function init(options: CrxOptions, plugins: CrxPluginFn[]) {
  return (
    plugins
      // initialize plugins with crx options
      .map((p) => p?.(options as Parameters<CrxPluginFn>[0]))
      .flat()
      // remove undefined elements
      .filter((p): p is CrxPlugin => !!p && typeof p.name === 'string')
  )
}

export const crx = ({
  manifest,
  ...options
}: {
  manifest: ManifestV3Export
} & CrxOptions): PluginOption[] => {
  const plugins = init(options, [
    pluginHMR,
    pluginHtmlInlineScripts,
    pluginBackground,
    /** Only manifest plugin uses manifest, other plugins get manifest in manifest hooks */
    pluginManifest(manifest),
    pluginFileWriterPages,
  ])

  // file writer runs `fileWriterStart` hook on all plugins
  plugins.unshift(...init(options, [pluginFileWriter(plugins)]))

  return plugins
}

export const chromeExtension = crx

export { defineDynamicResource, defineManifest } from './defineManifest'
export { filesReady } from './fileWriter'
export type { CrxPlugin, ManifestV3Export }
