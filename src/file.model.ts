/* eslint-disable @typescript-eslint/no-empty-interface */
import { EmittedAsset, EmittedChunk } from 'rollup'
import { JsonObject, PackageJson } from 'type-fest'
import { EventFrom } from 'xstate'
import { createModel } from 'xstate/lib/model'
import { isString } from './helpers'

export type FileType =
  | 'css'
  | 'html'
  | 'image'
  | 'raw'
  | 'json'
  | 'manifest'

export type Manifest = chrome.runtime.Manifest

export interface Script extends EmittedChunk {
  fileName: string
  manifestPath: string
  name?: never
}

export interface BaseAsset extends EmittedAsset {
  id: string
  fileName: string
  manifestPath: string
  name?: never
}

export interface StringAsset extends BaseAsset {
  source: string
}
export function isStringAsset(x: Asset): x is StringAsset {
  return isString(x.source)
}

export interface RawAsset extends BaseAsset {
  source: Uint8Array
}
export function isRawAsset(x: Asset): x is RawAsset {
  return x.source instanceof Uint8Array
}

export interface JsonAsset extends BaseAsset {
  jsonData: JsonObject
}
export function isJsonAsset(x: Asset): x is JsonAsset {
  return 'jsonData' in x && !('packageJson' in x)
}

export interface ManifestAsset extends JsonAsset {
  jsonData: Manifest
  packageJson: PackageJson
}
export function isManifestAsset(x: Asset): x is ManifestAsset {
  return 'jsonData' in x && 'packageJson' in x
}

export type Asset =
  | ManifestAsset
  | JsonAsset
  | RawAsset
  | StringAsset

export type File = Asset | Script
export type FileEvent = EventFrom<
  ReturnType<typeof createAssetModel>
>

export const fileModel = createModel({} as File, {
  events: {
    ERROR: (error: Error) => ({ error }),
    START: () => ({}),
    READY: (file: Asset) => ({ file }),
  },
})

export const createAssetModel = <TContext extends BaseAsset>(
  context: TContext,
) =>
  createModel(context, {
    events: {
      // public events
      ERROR: (error: Error) => ({ error }),
      START: () => ({}),
      READY: (file: Asset) => ({ file }),
      // parsing events
      ADD_CSS: (file: StringAsset) => ({ file }),
      ADD_HTML: (file: StringAsset) => ({ file }),
      ADD_IMAGE: (file: RawAsset) => ({ file }),
      ADD_JSON: (file: JsonAsset) => ({ file }),
      ADD_RAW: (file: RawAsset) => ({ file }),
      ADD_SCRIPT: (file: Script) => ({ file }),
    },
  })

export const createScriptModel = <TContext extends Script>(
  context: TContext,
) =>
  createModel(context, {
    events: {
      // private events
      ERROR: (error: Error) => ({ error }),
      START: () => ({}),
    },
  })
