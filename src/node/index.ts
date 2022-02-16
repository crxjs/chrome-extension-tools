import type { ManifestV3Export } from './define'
import { pluginContentScripts } from './plugin-contentScripts'
import { pluginFileWriter } from './plugin-fileWriter'
import { pluginHMR } from './plugin-hmr'
import { pluginHtmlAuditor } from './plugin-htmlAuditor'
import { pluginManifest } from './plugin-manifest'
import { pluginResources } from './plugin-resources'
import type { CrxOptions, CrxPlugin, CrxPluginFn } from './types'
import { pluginBackground } from './plugin-background'

export const crx = ({
  manifest,
  ...options
}: {
  manifest: ManifestV3Export
} & CrxOptions): CrxPlugin[] => {
  const plugins = [
    pluginFileWriter,
    pluginContentScripts,
    pluginBackground,
    pluginHMR,
    pluginHtmlAuditor,
    pluginManifest(manifest),
    pluginResources,
  ]
    .map((p) => p?.(options as Parameters<CrxPluginFn>[0]))
    .flat()
    .filter((p): p is CrxPlugin => !!p && typeof p.name === 'string')

  return plugins
}

export const chromeExtension = crx

export { defineDynamicResource, defineManifest } from './define'
export { filesReady, rebuildFiles } from './plugin-fileWriter'
export type { CrxPlugin }
