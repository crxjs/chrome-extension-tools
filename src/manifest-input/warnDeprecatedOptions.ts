import { format } from '$src/helpers'
import { isMV3 } from '$src/manifest-types'
import { isUndefined } from 'lodash'
import { PluginContext } from 'rollup'
import {
  ManifestInputPluginCache,
  ManifestInputPluginOptions,
} from '../types'

export function warnDeprecatedOptions(
  this: PluginContext,
  {
    browserPolyfill,
    contentScriptWrapper,
    crossBrowser,
    dynamicImportWrapper,
    firstClassManifest,
    iifeJsonPaths,
    publicKey,
    wrapContentScripts,
  }: Pick<
    ManifestInputPluginOptions,
    | 'browserPolyfill'
    | 'cache'
    | 'contentScriptWrapper'
    | 'crossBrowser'
    | 'dynamicImportWrapper'
    | 'firstClassManifest'
    | 'iifeJsonPaths'
    | 'publicKey'
    | 'verbose'
    | 'wrapContentScripts'
  >,
  cache: ManifestInputPluginCache,
) {
  /* ------------ WARN DEPRECATED OPTIONS ------------ */
  if (crossBrowser)
    this.warn(
      format`options.crossBrowser is deprecated
      This option does nothing internally`,
    )

  if (typeof firstClassManifest === 'boolean')
    this.warn(
      format`options.firstClassManifest is deprecated
      This option does nothing internally`,
    )

  if (iifeJsonPaths?.length)
    this.warn(
      format`options.iifeJsonPaths is deprecated
      This option does nothing internally`,
    )

  if (typeof contentScriptWrapper === 'undefined')
    this.warn(
      format`options.contentScriptWrapper is deprecated
      Content scripts are no longer wrapped in production`,
    )

  if (typeof wrapContentScripts === 'undefined')
    this.warn(
      format`options.wrapContentScripts is deprecated
      Content scripts are no longer wrapped in production`,
    )

  if (browserPolyfill && isMV3(cache.manifest))
    this.warn(
      format`options.browserPolyfill is not supported for MV3
      It may be supported in a future version
      For alternatives: https://extend-chrome.dev/rollup-plugin#mv3-faq`,
    )

  if (!isUndefined(dynamicImportWrapper))
    this.warn(
      format`options.dynamicImportWrapper is deprecated
      Content scripts are no longer wrapped in production
      Only background pages or service workers use wrappers`,
    )

  if (publicKey)
    this.warn(
      format`options.publicKey is deprecated
      This option does nothing internally
      Please use options.extendManifest instead
      For more info: https://extend-chrome.dev/rollup-plugin#mv3-faq`,
    )
}
