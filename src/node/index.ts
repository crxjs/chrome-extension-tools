import type { ManifestV3Export } from './defineManifest'
import { pluginDynamicScripts } from './plugin-dynamicScripts'
import { pluginFileWriter } from './plugin-fileWriter'
import { pluginHMR } from './plugin-hmr'
import { pluginHtmlAuditor } from './plugin-htmlAuditor'
import { pluginManifest } from './plugin-manifest'
import { pluginResources } from './plugin-resources'
import type { CrxOptions, CrxPlugin, CrxPluginFn } from './types'
import { pluginBackground } from './plugin-background'
import { pluginContentScripts } from './plugin-contentScripts'
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
    pluginHtmlAuditor,
    pluginResources,
    pluginContentScripts,
    pluginDynamicScripts,
    pluginBackground,
    pluginManifest(manifest),
  ])

  // file writer runs `fileWriterStart` hook on all plugins
  plugins.unshift(...init(options, [pluginFileWriter(plugins)]))

  return plugins
}

export const chromeExtension = crx

export { defineDynamicResource, defineManifest } from './defineManifest'
export { filesReady, rebuildFiles } from './plugin-fileWriter--events'
export type { CrxPlugin }
