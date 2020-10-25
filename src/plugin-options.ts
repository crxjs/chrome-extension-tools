import { Plugin, PluginHooks } from 'rollup'
import { ValidateNamesPlugin } from './validate-names/index'
import { DynamicImportWrapperOptions } from './manifest-input/dynamicImportWrapper'
import { ChromeExtensionManifest } from './manifest'
import { CheerioFile } from './html-inputs/cheerio'

/* -------------- MAIN PLUGIN OPTIONS -------------- */

export interface ChromeExtensionOptions {
  browserPolyfill?:
    | boolean
    | {
        executeScript: boolean
      }
  dynamicImportWrapper?: DynamicImportWrapperOptions | false
  extendManifest?:
    | Partial<ChromeExtensionManifest>
    | ((
        manifest: ChromeExtensionManifest,
      ) => ChromeExtensionManifest)
  firstClassManifest?: boolean
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
  | 'name'
  | 'options'
  | 'buildStart'
  | 'watchChange'
  | 'generateBundle'
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
  input: string[]
  inputAry: string[]
  inputObj: Record<string, string>
  permsHash: string
  srcDir: string | null
  /** for memoized fs.readFile */
  readFile: Map<string, any>
  manifest?: ChromeExtensionManifest
  assetChanged: boolean
}

export type ManifestInputPlugin = Pick<
  PluginHooks,
  'options' | 'buildStart' | 'watchChange' | 'generateBundle'
> & {
  name: string
  srcDir: string | null
  browserPolyfill?: ChromeExtensionOptions['browserPolyfill']
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

export type HtmlInputsPlugin = Pick<
  Required<Plugin>,
  'name' | 'options' | 'buildStart' | 'watchChange'
> & { cache: HtmlInputsPluginCache }
