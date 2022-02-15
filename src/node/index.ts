import type { ManifestV3Export } from './define'
import { pluginDynamicScripts } from './plugin-dynamicScripts'
import { pluginEsmFormat } from './plugin-esmFormat'
import { pluginFileWriter } from './plugin-fileWriter'
import { pluginHMR } from './plugin-hmr'
import { pluginHtmlAuditor } from './plugin-htmlAuditor'
import { pluginManifest } from './plugin-manifest'
import { pluginResources } from './plugin-resources'
import type { CrxOptions, CrxPlugin, CrxPluginFn } from './types'

export const crx = ({
  manifest,
  ...options
}: {
  manifest: ManifestV3Export
} & CrxOptions): CrxPlugin[] => {
  const plugins = [
    pluginFileWriter,
    pluginDynamicScripts,
    pluginEsmFormat,
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

export { filesReady, rebuildFiles } from './plugin-fileWriter'
export { defineDynamicResource, defineManifestV3 } from './define'
export type { CrxPlugin }
