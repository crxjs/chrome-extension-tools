import { ModuleFormat, Plugin } from 'rollup'
import { ViteDevServer } from 'vite'
import { CheerioFile } from './html-inputs/cheerio'
import { DynamicImportWrapperOptions } from './manifest-input/dynamicImportWrapper'

interface VitePlugin {
  // configResolved: (
  //   config: ResolvedConfig,
  // ) => void | Promise<void>
  configureServer: (
    server: ViteDevServer,
  ) => (() => void) | void | Promise<(() => void) | void>
}

/* -------------- MAIN PLUGIN OPTIONS -------------- */

export interface ChromeExtensionOptions {
  /**
   * @deprecated This is not supported for MV3, use this instead:
   * ```js
   * import browser from 'webextension-polyfill'
   * ```
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
  /** @deprecated Is not supported as of 5.0.0 */
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
   * ```js
   * chromeExtension({ extendManifest: { key: '...' } })
   * ```
   */
  publicKey?: string
  /** @deprecated Does nothing internally in MV3 */
  verbose?: boolean
  // /**
  //  * @deprecated Not implemented.
  //  * If false, content scripts will be rebundled with IIFE format
  //  */
  // esmContentScripts?: boolean
  /** @deprecated Escape hatch for content script dynamic import wrapper */
  wrapContentScripts?: boolean
}

export type ChromeExtensionPlugin = ManifestInputHooks &
  HtmlInputHooks &
  VitePlugin

/* --------- MANIFEST INPUT PLUGIN OPTIONS --------- */

export interface ManifestInputPluginOptions
  extends ChromeExtensionOptions {
  cache?: ManifestInputPluginCache
}

export interface ManifestInputPluginCache {
  assets: string[]
  background: string[]
  contentScripts: string[]
  input: string[]
  inputAry: string[]
  inputObj: Record<string, string>
  permsHash: string
  srcDir: string
  /** for memoized fs.readFile */
  readFile: Map<string, any>
  manifest?: chrome.runtime.Manifest
  assetChanged: boolean
}

export type ManifestInputHooks = Pick<
  Required<Plugin>,
  | 'name'
  | 'options'
  | 'buildStart'
  | 'resolveId'
  | 'load'
  | 'watchChange'
  | 'outputOptions'
  | 'generateBundle'
>

export type ManifestInputPlugin = ManifestInputHooks & {
  srcDir: string | null
  browserPolyfill?: ChromeExtensionOptions['browserPolyfill']
  crossBrowser?: ChromeExtensionOptions['crossBrowser']
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

type HtmlInputHooks = Pick<
  Required<Plugin> & VitePlugin,
  'name' | 'options' | 'buildStart' | 'watchChange'
>
export type HtmlInputsPlugin = HtmlInputHooks & {
  cache: HtmlInputsPluginCache
}
