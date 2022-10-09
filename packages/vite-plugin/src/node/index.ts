import type { ManifestV3Export } from './defineManifest'
import { pluginHtmlInlineScripts } from './plugin-htmlInlineScripts'
import { pluginManifest } from './plugin-manifest'
import type { CrxOptions, CrxPlugin, CrxPluginFn } from './types'
import { pluginBackground } from './plugin-background'
import type { PluginOption } from 'vite'

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
    pluginHtmlInlineScripts,
    pluginBackground,
    /** Only manifest plugin uses manifest, other plugins get manifest in manifest hooks */
    pluginManifest(manifest),
  ])

  return plugins
}

export const chromeExtension = crx

export { defineDynamicResource, defineManifest } from './defineManifest'
export type { CrxPlugin, ManifestV3Export }
