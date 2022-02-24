import type { ManifestV3Export } from './defineManifest'
import { pluginContentScripts } from './plugin-contentScripts'
import { pluginFileWriter } from './plugin-fileWriter'
import { pluginHMR } from './plugin-hmr'
import { pluginHtmlAuditor } from './plugin-htmlAuditor'
import { pluginManifest } from './plugin-manifest'
import { pluginResources } from './plugin-resources'
import type { CrxOptions, CrxPlugin, CrxPluginFn } from './types'
import { pluginBackground } from './plugin-background'

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
} & CrxOptions): CrxPlugin[] => {
  const plugins = init(options, [
    pluginContentScripts,
    pluginBackground,
    pluginHMR,
    pluginHtmlAuditor,
    pluginManifest(manifest),
    pluginResources,
  ])

  plugins.unshift(...init(options, [pluginFileWriter(plugins)]))

  return plugins
}

export const chromeExtension = crx

export { defineDynamicResource, defineManifest } from './defineManifest'
export { filesReady, rebuildFiles } from './plugin-fileWriter'
export type { CrxPlugin }
