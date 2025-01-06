import { ModuleFormat, Plugin } from 'rollup'
import { CheerioFile } from './html-inputs/cheerio'
import { DynamicImportWrapperOptions } from './manifest-input/dynamicImportWrapper'
import { ValidateNamesPlugin } from './validate-names/index'

// eslint-disable-next-line @typescript-eslint/ban-types -- Just to extract whatever function is defined
type ExtractFunction<T> = Extract<T, Function>
type RequiredPlugin = Required<Plugin>
export type PluginWithFunctionHooks = {
  [K in keyof RequiredPlugin]: ExtractFunction<RequiredPlugin[K]> extends never
    ? RequiredPlugin[K]
    : ExtractFunction<RequiredPlugin[K]>
}

/* -------------- MAIN PLUGIN OPTIONS -------------- */

export interface ChromeExtensionOptions {
  /**
   * @deprecated This is not supported for MV3, use this instead:
   *
   *   ```js
   *   import browser from 'webextension-polyfill'
   *   ```
   */
  browserPolyfill?:
    | boolean
    | {
        executeScript: boolean
      }
  /** @deprecated Alias for `wrapContentScript` */
  contentScriptWrapper?: boolean
  /** @deprecated Not implemented yet */
  crossBrowser?: boolean
  /** @deprecated Does nothing internally in MV3 */
  dynamicImportWrapper?: DynamicImportWrapperOptions | false
  /** Extend the manifest programmatically. */
  extendManifest?:
    | Partial<chrome.runtime.Manifest>
    | (<T extends chrome.runtime.ManifestBase>(manifest: T) => T)
  /** @deprecated Will not be supported in next major version */
  firstClassManifest?: boolean
  /** @deprecated Dropped in favor of `esmContentScripts` */
  iifeJsonPaths?: string[]
  pkg?: {
    description: string
    name: string
    version: string
  }
  /**
   * @deprecated Use `options.extendManifest.key`
   *
   *   ```js
   *   chromeExtension({ extendManifest: { key: '...' } })
   *   ```
   */
  publicKey?: string
  /** @deprecated Does nothing internally in MV3 */
  verbose?: boolean
  // /**
  //  * @deprecated Not implemented.
  //  * If false, content scripts will be rebundled with IIFE format
  //  */
  // esmContentScripts?: boolean
  /** Escape hatch for content script dynamic import wrapper */
  wrapContentScripts?: boolean
}

export type ChromeExtensionPlugin = Pick<
  PluginWithFunctionHooks,
  'name' | ManifestInputPluginHooks | HtmlInputsPluginHooks
> & {
  // For testing
  _plugins: {
    manifest: ManifestInputPlugin
    html: HtmlInputsPlugin
    validate: ValidateNamesPlugin
  }
  // to warn v3 doesn't support Vite
  config: () => void
}

/* --------- MANIFEST INPUT PLUGIN OPTIONS --------- */

export interface ManifestInputPluginOptions extends ChromeExtensionOptions {
  cache?: ManifestInputPluginCache
}

export interface ManifestInputPluginCache {
  assets: string[]
  chunkFileNames?: string
  contentScripts: string[]
  iife: string[]
  input: string[]
  inputAry: string[]
  inputObj: Record<string, string>
  permsHash: string
  srcDir: string | null
  /** For memoized fs.readFile */
  readFile: Map<string, any>
  manifest?: chrome.runtime.Manifest
  assetChanged: boolean
}

type ManifestInputPluginHooks =
  | 'options'
  | 'buildStart'
  | 'resolveId'
  | 'load'
  | 'transform'
  | 'watchChange'
  | 'generateBundle'

export type ManifestInputPlugin = Pick<
  PluginWithFunctionHooks,
  ManifestInputPluginHooks
> & {
  name: string
  srcDir: string | null
  browserPolyfill?: ChromeExtensionOptions['browserPolyfill']
  crossBrowser?: ChromeExtensionOptions['crossBrowser']
  formatMap?: Partial<Record<ModuleFormat, string[] | Record<string, string>>>
}

/* ----------- HTML INPUTS PLUGIN OPTIONS ---------- */

export interface HtmlInputsOptions {
  browserPolyfill?: ChromeExtensionOptions['browserPolyfill']
  /** This will change between builds, so cannot destructure */
  readonly srcDir: string | null
}

export interface HtmlInputsPluginCache {
  /** Scripts that should not be bundled */
  scripts: string[]
  /** Scripts that should be bundled */
  js: string[]
  /** Absolute paths for HTML files to emit */
  html: string[]
  /** Html files as Cheerio objects */
  html$: CheerioFile[]
  /** Image files to emit */
  img: string[]
  /** Stylesheets to emit */
  css: string[]
  /** Cache of last options.input, will have other scripts */
  input: string[]
  /** Source dir for calculating relative paths */
  srcDir?: string
}

type HtmlInputsPluginHooks = 'name' | 'options' | 'buildStart' | 'watchChange'

export type HtmlInputsPlugin = Pick<
  PluginWithFunctionHooks,
  HtmlInputsPluginHooks
> & {
  cache: HtmlInputsPluginCache
}
