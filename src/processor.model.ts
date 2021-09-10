import { EmittedAsset, EmittedChunk } from 'rollup'
import { JsonObject, Promisable } from 'type-fest'
import { createModel } from 'xstate/lib/model'

export type ProcessorId =
  | 'manifest'
  | 'html'
  | 'css'
  | 'images'
  | 'assets'

interface Base {
  id: string
  processorId: ProcessorId
  processedAt?: Date
}

export interface AssetFile extends EmittedAsset, Base {
  encoding?: string
}
export interface ChunkFile extends EmittedChunk, Base {}
export type Manifest = chrome.runtime.Manifest

interface RPCEHooks {
  manifest?: (
    id: 'manifest',
    source: Manifest,
  ) => Promisable<Manifest | null | undefined>
  html?: (
    id: string,
    source: string,
  ) => Promisable<string | null | undefined>
  css?: (
    id: string,
    source: string,
  ) => Promisable<string | null | undefined>
  images?: (
    id: string,
    source: Uint8Array,
  ) => Promisable<Uint8Array | null | undefined>
  assets?: (
    id: string,
    source: Uint8Array,
  ) => Promisable<Uint8Array | null | undefined>
}
export interface RPCEPlugin {
  name: string
  preRPCE?: RPCEHooks
  postRPCE?: RPCEHooks
}

// const plugin: RPCEPlugin = {
//   name: 'my plugin',
//   preRPCE: {
//     manifest: (id, manifest) => {
//       if (manifest.manifest_version === 3) return
//       manifest?.background?.scripts?.push('some-script.js')
//       return manifest
//     },
//   },
// }

export interface ProcessorContext {
  file: AssetFile
  plugins: RPCEPlugin[]
}
const context: ProcessorContext = {
  file: {} as AssetFile,
  plugins: [],
}
export type ProcessorEvent =
  | { type: 'LOAD_JSON'; data: JsonObject }
  | { type: 'ASSET'; file: AssetFile }
  | { type: 'CHUNK'; file: ChunkFile }
  | { type: 'ERROR'; error: Error }
  | { type: 'DONE' }
export const processorModel = createModel(context, {
  events: {
    LOAD_JSON: (data: JsonObject) => ({ data }),
    ASSET: (file: AssetFile) => ({
      file,
    }),
    CHUNK: (file: ChunkFile) => ({
      file,
    }),
    ERROR: (error: Error) => ({ error }),
    DONE: () => ({}),
  },
})
