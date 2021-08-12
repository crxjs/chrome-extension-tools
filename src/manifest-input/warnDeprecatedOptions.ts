import { PluginContext } from 'rollup'
import { isMV2 } from '../manifest-types'
import {
  ManifestInputPluginCache,
  ManifestInputPluginOptions,
} from '../plugin-options'

export function warnDeprecatedOptions(
  this: PluginContext,
  {
    browserPolyfill,
    crossBrowser,
    dynamicImportWrapper,
    firstClassManifest,
    iifeJsonPaths,
    publicKey,
  }: Pick<
    ManifestInputPluginOptions,
    | 'crossBrowser'
    | 'browserPolyfill'
    | 'firstClassManifest'
    | 'iifeJsonPaths'
    | 'dynamicImportWrapper'
    | 'publicKey'
  >,
  cache: ManifestInputPluginCache,
) {
  /* ------------ WARN DEPRECATED OPTIONS ------------ */
  if (crossBrowser)
    this.warn('`options.crossBrowser` is not implemented yet')

  if (!firstClassManifest)
    this.warn(
      '`options.firstClassManifest` will be removed in version 5.0.0',
    )

  if (iifeJsonPaths?.length)
    this.warn('`options.iifeJsonPaths` is not implemented yet')

  // MV2 manifest is handled in `generateBundle`
  if (isMV2(cache.manifest)) return

  if (browserPolyfill)
    this.warn(
      [
        '`options.browserPolyfill` is deprecated for MV3 and does nothing internally',
        'See: https://extend-chrome.dev/rollup-plugin#mv3-faq',
      ].join('\n'),
    )

  if (dynamicImportWrapper !== true)
    this.warn(
      '`options.dynamicImportWrapper` is not required for MV3',
    )

  if (publicKey)
    this.warn(
      [
        '`options.publicKey` is deprecated for MV3,',
        'please use `options.extendManifest` instead',
        'see: https://extend-chrome.dev/rollup-plugin#mv3-faq',
      ].join('\n'),
    )
}
