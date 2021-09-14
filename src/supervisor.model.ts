import { PackageJson, Promisable } from 'type-fest'
import { ActorRefFrom, EventFrom, StateMachine } from 'xstate'
import { createModel } from 'xstate/lib/model'
import {
  Asset,
  File,
  FileEvent,
  JsonAsset,
  Manifest,
  ManifestAsset,
  RawAsset,
  Script,
  StringAsset,
} from './file.model'

export interface SupervisorContext {
  files: ActorRefFrom<StateMachine<File, any, FileEvent>>[]
  filesReady: number
  root: string
  input: string[]
  plugins: Set<RPCEPlugin>
}
const supervisorContext: SupervisorContext = {
  files: [],
  filesReady: 0,
  root: process.cwd(),
  input: [],
  plugins: new Set(),
}
export type SupervisorEvent = EventFrom<typeof supervisorModel>
export const supervisorModel = createModel(supervisorContext, {
  events: {
    // public events
    PLUGIN: (plugin: RPCEPlugin) => ({ plugin }),
    ROOT: (root: string) => ({ root }),
    INPUT: (input: string[]) => ({ input }),
    // file events
    CHANGE: (id: string) => ({ id }),
    ERROR: (error: Error) => ({ error }),
    START: () => ({}),
    READY: (file: Asset) => ({ file }),
    // parsing events
    ADD_CSS: (file: Omit<StringAsset, 'source'>) => ({ file }),
    ADD_HTML: (file: Omit<StringAsset, 'source'>) => ({ file }),
    ADD_IMAGE: (file: Omit<RawAsset, 'source'>) => ({ file }),
    ADD_JSON: (file: Omit<JsonAsset, 'jsonData'>) => ({ file }),
    ADD_MANIFEST: (
      file: Omit<ManifestAsset, 'jsonData' | 'packageJson'>,
    ) => ({
      file,
    }),
    ADD_RAW: (file: Omit<RawAsset, 'source'>) => ({ file }),
    ADD_SCRIPT: (file: Script) => ({ file }),
  },
})

type Nullable<TType> = TType | null | undefined

interface RPCEHooks {
  manifest?: (
    source: Manifest,
    packageJson: PackageJson,
  ) => Promisable<Nullable<Manifest>>
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

export interface RPCEPlugin extends Plugin {
  name: string
  crxTransform?: RPCEHooks
  crxRender?: RPCEHooks
}
