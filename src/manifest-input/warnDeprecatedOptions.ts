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
    contentScriptWrapper,
  }: Pick<
    ManifestInputPluginOptions,
    | 'crossBrowser'
    | 'browserPolyfill'
    | 'firstClassManifest'
    | 'iifeJsonPaths'
    | 'dynamicImportWrapper'
    | 'publicKey'
    | 'contentScriptWrapper'
  >,
  cache: ManifestInputPluginCache,
) {
  /* ------------ WARN DEPRECATED OPTIONS ------------ */
  if (crossBrowser)
    this.warn('`options.crossBrowser` is not implemented yet')

  if (typeof firstClassManifest === 'boolean')
    this.warn(
      '`options.firstClassManifest` is deprecated and does nothing internally',
    )

  if (iifeJsonPaths?.length)
    this.warn(
      '`options.iifeJsonPaths` is deprecated and does nothing internally',
    )

  if (typeof contentScriptWrapper !== 'undefined')
    this.warn(
      '`options.contentScriptWrapper` is deprecated.\nPlease use `options.wrapContentScript`',
    )

  if (isMV2(cache.manifest))
    // MV2 manifest is handled in `generateBundle`
    return

  if (browserPolyfill)
    this.warn(
      [
        '`options.browserPolyfill` is deprecated for MV3 and does nothing internally',
        'See: https://extend-chrome.dev/rollup-plugin#mv3-faq',
      ].join('\n'),
    )

  if (
    // This should be an empty object
    typeof dynamicImportWrapper !== 'object' ||
    Object.keys(dynamicImportWrapper).length > 0
  )
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
