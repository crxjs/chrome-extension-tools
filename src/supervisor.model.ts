import { EventFrom } from 'xstate'
import { createModel } from 'xstate/lib/model'
import {
  AssetFile,
  ChunkFile,
  RPCEPlugin,
} from './processor.model'

export interface SupervisorContext {
  files: Record<string, AssetFile | ChunkFile>
  root: string
  input: string[]
  plugins: RPCEPlugin[]
}
const context: SupervisorContext = {
  files: {},
  root: process.cwd(),
  input: [],
  plugins: [],
}

export type SupervisorEvent = EventFrom<typeof supervisorModel>
export const supervisorModel = createModel(context, {
  events: {
    // public events
    ROOT: (root: string) => ({ root }),
    INPUT: (input: string[]) => ({ input }),
    PARSE: () => ({}),
    PROCESS: () => ({}),
    ADD_PLUGIN: (plugin: RPCEPlugin) => ({ plugin }),
    // private events
    DONE: () => ({}),
    FILE_START: (file: AssetFile) => ({ file }),
    FILE_READY: (file: AssetFile) => ({ file }),
    ERROR: (error: Error) => ({ error }),
  },
})
