import { ModuleFormat, Plugin, PluginHooks } from 'rollup'
import { CheerioFile } from './html-inputs/cheerio'
import { DynamicImportWrapperOptions } from './manifest-input/dynamicImportWrapper'
import { ValidateNamesPlugin } from './validate-names/index'

/* -------------- MAIN PLUGIN OPTIONS -------------- */

export interface ChromeExtensionOptions {
  browserPolyfill?:
    | boolean
    | {
        executeScript: boolean
      }
  contentScriptWrapper?: boolean
  // TODO: use this option with iifeJsonPaths to enable a preset to support Firefox builds
  crossBrowser?: boolean
  dynamicImportWrapper?: DynamicImportWrapperOptions | false
  extendManifest?:
    | Partial<chrome.runtime.Manifest>
    | (<T extends chrome.runtime.ManifestBase>(manifest: T) => T)
  firstClassManifest?: boolean
  iifeJsonPaths?: string[]
  pkg?: {
    description: string
    name: string
    version: string
  }
  publicKey?: string
  verbose?: boolean
}

export type ChromeExtensionPlugin = Pick<
  Required<Plugin>,
  'name' | ManifestInputPluginHooks | HtmlInputsPluginHooks
> & {
  // For testing
  _plugins: {
    manifest: ManifestInputPlugin
    html: HtmlInputsPlugin
    validate: ValidateNamesPlugin
  }
}

/* --------- MANIFEST INPUT PLUGIN OPTIONS --------- */

export interface ManifestInputPluginOptions
  extends ChromeExtensionOptions {
  cache?: ManifestInputPluginCache
}

export interface ManifestInputPluginCache {
  assets: string[]
  contentScripts: string[]
  contentScriptRefIds: Record<string, string>
  iife: string[]
  input: string[]
  inputAry: string[]
  inputObj: Record<string, string>
  permsHash: string
  srcDir: string | null
  /** for memoized fs.readFile */
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
  PluginHooks,
  ManifestInputPluginHooks
> & {
  name: string
  srcDir: string | null
  browserPolyfill?: ChromeExtensionOptions['browserPolyfill']
  crossBrowser?: ChromeExtensionOptions['crossBrowser']
  formatMap?: Partial<
    Record<ModuleFormat, string[] | Record<string, string>>
  >
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

type HtmlInputsPluginHooks =
  | 'name'
  | 'options'
  | 'buildStart'
  | 'watchChange'

export type HtmlInputsPlugin = Pick<
  Required<Plugin>,
  HtmlInputsPluginHooks
> & { cache: HtmlInputsPluginCache }
