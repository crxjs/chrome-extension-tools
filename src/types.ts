import { PluginContext } from 'rollup'
import { JsonObject, Promisable } from 'type-fest'
import { Plugin as VitePlugin } from 'vite'
import { isPresent, Unpacked } from './helpers'

type Nullable<TType> = TType | null | undefined
export type Writeable<T> = { -readonly [P in keyof T]: T[P] }
export type Manifest = chrome.runtime.Manifest

export type ManifestV2 = Omit<
  chrome.runtime.ManifestV2,
  'name' | 'description' | 'version'
> &
  Partial<
    Pick<
      chrome.runtime.ManifestV2,
      'name' | 'description' | 'version'
    >
  >

export type ManifestV3 = Omit<
  chrome.runtime.ManifestV3,
  'name' | 'description' | 'version'
> &
  Partial<
    Pick<
      chrome.runtime.ManifestV3,
      'name' | 'description' | 'version'
    >
  >

export type ContentScript = Unpacked<
  chrome.runtime.Manifest['content_scripts']
>

export type WebAccessibleResource = Unpacked<
  chrome.runtime.ManifestV3['web_accessible_resources']
>

export type DeclarativeNetRequestResource = {
  id: string
  enabled: boolean
  path: string
}

export function isMV2(
  m?: chrome.runtime.ManifestBase,
): m is chrome.runtime.ManifestV2 {
  if (!isPresent(m)) throw new TypeError('manifest is undefined')
  return m.manifest_version === 2
}

export function isMV3(
  m?: chrome.runtime.ManifestBase,
): m is chrome.runtime.ManifestV3 {
  if (!isPresent(m)) throw new TypeError('manifest is undefined')
  return m.manifest_version === 3
}

export type AssetType =
  | 'CSS'
  | 'HTML'
  | 'IMAGE'
  | 'JSON'
  | 'MANIFEST'
  | 'RAW'

export type ScriptType =
  | 'SCRIPT_BACKGROUND'
  | 'SCRIPT_DECLARED'
  | 'SCRIPT_DYNAMIC'
  | 'SCRIPT_HTML'

export type FileType = AssetType | ScriptType

export type ParserReturnType = Record<
  Exclude<FileType, 'MANIFEST' | 'HTML' | 'JSON'>,
  string[]
>

export interface Script {
  fileType: ScriptType
  /* Input file name, absolute */
  id: string
  /* Output file name, relative to outDir */
  fileName: string
  /* File ref id from Rollup emitFile */
  refId?: string
}

export interface BaseAsset {
  fileType: AssetType
  /* Input file name, relative to root */
  id: string
  /* Output file name, relative to outDir */
  fileName: string
  /* File ref id from Rollup emitFile */
  refId?: string
  /* Directory of source file, only manifest supported now */
  dirName?: string
}

export interface StringAsset extends BaseAsset {
  fileType: 'CSS' | 'HTML'
  source: string
}

export interface RawAsset extends BaseAsset {
  fileType: 'IMAGE' | 'RAW'
  source: Uint8Array
}

export interface JsonAsset extends BaseAsset {
  fileType: 'JSON'
  source: JsonObject
}

export interface ManifestAsset extends BaseAsset {
  fileType: 'MANIFEST'
  source: Manifest
}

export type Asset =
  | StringAsset
  | RawAsset
  | JsonAsset
  | ManifestAsset

export interface EmittedFile {
  fileType: FileType
  fileName: string
  id: string
  type: 'chunk' | 'asset'
  refId: string
  source?: string | Uint8Array
  wrapperName?: string
}

interface CrxHookTypes {
  manifest?: (
    this: PluginContext,
    source: Manifest,
  ) => Promisable<Nullable<Manifest>>
  html?: (
    this: PluginContext,
    source: string,
    file: StringAsset,
  ) => Promisable<Nullable<StringAsset | string>>
  css?: (
    this: PluginContext,
    source: string,
    file: StringAsset,
  ) => Promisable<Nullable<StringAsset | string>>
  image?: (
    this: PluginContext,
    source: Uint8Array,
    file: RawAsset,
  ) => Promisable<Nullable<RawAsset | Uint8Array>>
  json?: (
    this: PluginContext,
    file: JsonAsset,
  ) => Promisable<Nullable<JsonAsset>>
  raw?: (
    this: PluginContext,
    source: Uint8Array,
    file: RawAsset,
  ) => Promisable<Nullable<RawAsset | Uint8Array>>
}

export type CrxHookType = 'transform' | 'render'

type CreateCrxHooks<THooks> = {
  [TransformProp in keyof THooks as `${CrxHookType}Crx${Capitalize<
    string & TransformProp
  >}`]: THooks[TransformProp]
}

export type CrxHooks = CreateCrxHooks<CrxHookTypes>

export type CrxPlugin = VitePlugin &
  CrxHooks & {
    /** This prop is required to ensure during serve mode that written files use the same plugin */
    crx?: boolean
  }

export type InternalCrxPlugin = CrxPlugin & {
  crxOptions?: CrxPlugin['options']
  crxBuildStart?: CrxPlugin['buildStart']
  crxGenerateBundle?: CrxPlugin['generateBundle']
}

export interface ChromeExtensionOptions {
  /**
   * @deprecated This is not supported for MV3, use this instead:
   * ```js
   * import browser from 'webextension-polyfill'
   * ```
   */
  browserPolyfill:
    | boolean
    | {
        executeScript: boolean
      }
  /**
   * Content scripts use ES modules by default.
   * Set to 'iife' if you need content scripts not to use ESM.
   * Note that content script HMR is only compatible with ESM.
   */
  contentScriptFormat: 'iife' | 'esm'
  /**
   * @deprecated Use a dynamic manifest instead.
   * TODO: add link to docs
   */
  extendManifest?:
    | Partial<Manifest>
    | (<T extends chrome.runtime.ManifestBase>(manifest: T) => T)
  pkg?: {
    description: string
    name: string
    version: string
  }
}
