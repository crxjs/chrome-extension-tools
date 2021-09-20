import { Plugin } from 'vite'
import { JsonObject, Promisable } from 'type-fest'
import { isPresent, Unpacked } from './helpers'

type Nullable<TType> = TType | null | undefined
type Manifest = chrome.runtime.Manifest

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

export type FileType =
  | 'CSS'
  | 'HTML'
  | 'IMAGE'
  | 'JSON'
  | 'MANIFEST'
  | 'RAW'
  | 'SCRIPT'

export interface BaseAsset {
  fileType: FileType
  /* Input file name, relative to root */
  id: string
  /* Output file name, relative to outDir */
  fileName?: string
  /* Where the file is referenced, html or manifest and JSON path */
  origin?: string
}

export interface StringAsset extends BaseAsset {
  fileType: 'CSS' | 'HTML'
  source?: string
}

export interface RawAsset extends BaseAsset {
  fileType: 'IMAGE' | 'RAW'
  source?: Uint8Array
}

export interface JsonAsset extends BaseAsset {
  fileType: 'JSON'
  source?: JsonObject
}

export interface ManifestAsset extends BaseAsset {
  fileType: 'MANIFEST'
  source?: Manifest
}

export type Asset =
  | StringAsset
  | RawAsset
  | JsonAsset
  | ManifestAsset

interface RPCEHookTypes {
  manifest?: (source: Manifest) => Promisable<Nullable<Manifest>>
  html?: (
    source: string,
    file: StringAsset,
  ) => Promisable<Nullable<StringAsset | string>>
  css?: (
    source: string,
    file: StringAsset,
  ) => Promisable<Nullable<StringAsset | string>>
  image?: (
    source: Uint8Array,
    file: RawAsset,
  ) => Promisable<Nullable<RawAsset | Uint8Array>>
  json?: (file: JsonAsset) => Promisable<Nullable<JsonAsset>>
  raw?: (
    source: Uint8Array,
    file: RawAsset,
  ) => Promisable<Nullable<RawAsset | Uint8Array>>
}

type RPCEHooks<THooks> = {
  [TransformProp in keyof THooks as `transformCrx${Capitalize<
    string & TransformProp
  >}`]: THooks[TransformProp]
} &
  {
    [RenderProp in keyof THooks as `renderCrx${Capitalize<
      string & RenderProp
    >}`]: THooks[RenderProp]
  }

export type RPCEPlugin = Plugin & RPCEHooks<RPCEHookTypes>

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
  /**
   * @deprecated Use a dynamic manifest instead.
   * TODO: add link to docs
   */
  extendManifest?:
    | Partial<chrome.runtime.Manifest>
    | (<T extends chrome.runtime.ManifestBase>(manifest: T) => T)
  pkg?: {
    description: string
    name: string
    version: string
  }
}
