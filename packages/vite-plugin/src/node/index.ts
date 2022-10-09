import type { ManifestV3Export } from './defineManifest'
import { pluginFileWriter } from './plugin-fileWriter'
import { pluginHMR } from './plugin-hmr'
import { pluginHtmlInlineScripts } from './plugin-htmlInlineScripts'
import { pluginManifest } from './plugin-manifest'
import { pluginContentScripts } from './plugin-contentScripts'
import type { CrxOptions, CrxPlugin, CrxPluginFn } from './types'
import { pluginBackground } from './plugin-background'
import type { PluginOption } from 'vite'

function init(options: CrxOptions, plugins: CrxPluginFn[]) {
  return plugins
    .map((p) => p?.(options as Parameters<CrxPluginFn>[0]))
    .flat()
    .filter((p): p is CrxPlugin => !!p && typeof p.name === 'string')
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
    pluginContentScripts,
    pluginBackground,
    pluginManifest(manifest),
  ])

  // file writer runs `fileWriterStart` hook on all plugins
  plugins.unshift(...init(options, [pluginFileWriter(plugins)]))

  return plugins
}

export const chromeExtension = crx

export { defineDynamicResource, defineManifest } from './defineManifest'
export { filesReady } from './plugin-fileWriter--events'
export type { CrxPlugin, ManifestV3Export }
