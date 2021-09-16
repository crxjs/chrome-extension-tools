/* eslint-disable @typescript-eslint/no-empty-interface */
import { EmittedAsset, EmittedChunk } from 'rollup'
import { JsonObject, PackageJson } from 'type-fest'
import { EventFrom } from 'xstate'
import { createModel } from 'xstate/lib/model'

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
  origin: string
  name?: never
}
export interface StringAsset extends BaseAsset {
  source: string
}
export interface RawAsset extends BaseAsset {
  source: Uint8Array
}
export interface JsonAsset extends BaseAsset {
  jsonData: JsonObject
}
export interface ManifestAsset extends JsonAsset {
  jsonData: Manifest
  packageJson: PackageJson
  root: string
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

export const parsingEventCreators = {
  ADD_MANIFEST: (file: Partial<ManifestAsset>) => ({
    file: { ...file, type: 'asset' as const },
  }),
  ADD_CSS: (file: Partial<StringAsset>) => ({
    file: { ...file, type: 'asset' as const },
  }),
  ADD_HTML: (file: Partial<StringAsset>) => ({
    file: { ...file, type: 'asset' as const },
  }),
  ADD_IMAGE: (file: Partial<RawAsset>) => ({
    file: { ...file, type: 'asset' as const },
  }),
  ADD_JSON: (file: Partial<JsonAsset>) => ({
    file: { ...file, type: 'asset' as const },
  }),
  ADD_RAW: (file: Partial<RawAsset>) => ({
    file: { ...file, type: 'asset' as const },
  }),
  ADD_SCRIPT: (file: Partial<Script>) => ({
    file: { ...file, type: 'chunk' as const },
  }),
}

export const createAssetModel = <TContext extends BaseAsset>(
  context: TContext,
) =>
  createModel(context, {
    events: {
      // public events
      ERROR: (error: Error) => ({ error }),
      START: () => ({}),
      READY: (file: Partial<TContext>) => ({ file }),
      CHANGE: (id: string) => ({ id }),
      // parsing events
      ...parsingEventCreators,
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
