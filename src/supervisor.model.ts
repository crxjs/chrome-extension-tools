import { Plugin } from 'rollup'
import { PackageJson, Promisable } from 'type-fest'
import { ActorRefFrom, EventFrom, StateMachine } from 'xstate'
import { createModel } from 'xstate/lib/model'
import {
  Asset,
  File,
  FileEvent,
  JsonAsset,
  Manifest,
  parsingEventCreators,
  RawAsset,
  Script,
  StringAsset,
} from './file.model'

export interface SupervisorContext {
  files: ActorRefFrom<StateMachine<File, any, FileEvent>>[]
  filesReady: number
  root: string
  entries: (
    | {
        type: 'ADD_SCRIPT'
        file: Partial<Script>
      }
    | {
        type: `ADD_${string}`
        file: Partial<Asset>
      }
  )[]
  plugins: Set<RPCEPlugin>
}
const supervisorContext: SupervisorContext = {
  files: [],
  filesReady: 0,
  root: process.cwd(),
  entries: [],
  plugins: new Set(),
}
export type SupervisorEvent = EventFrom<typeof supervisorModel>
export const supervisorModel = createModel(supervisorContext, {
  events: {
    // public events
    PLUGIN: (plugin: RPCEPlugin) => ({ plugin }),
    ROOT: (root: string) => ({ root }),
    START: () => ({}),
    READY: (file: File) => ({ file }),
    CHANGE: (id: string, change: { event: string }) => ({
      id,
      ...change,
    }),
    // file events
    ERROR: (error: Error) => ({ error }),
    // parsing events
    ...parsingEventCreators,
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
