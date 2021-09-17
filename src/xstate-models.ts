import { ChangeEvent, EmittedFile } from 'rollup'
import { EventFrom } from 'xstate'
import { createModel } from 'xstate/lib/model'
import { Asset, FileType, BaseAsset } from './types'

export const fileTypes: FileType[] = [
  'CSS',
  'HTML',
  'IMAGE',
  'JSON',
  'MANIFEST',
  'RAW',
  'SCRIPT',
]

export type PluginsStartOptions = Asset & {
  hook: 'transform' | 'render'
}

export const sharedEventCreators = {
  ROOT: (root: string) => ({ root }),
  ADD_FILE: (options: BaseAsset) => options,
  FILE_DONE: (file: EmittedFile & { id: string }) => ({ file }),
  CHANGE: (id: string, change: { event: ChangeEvent }) => ({
    id,
    ...change,
  }),
  ERROR: (error: Error) => ({ error }),
  START: () => ({}),
  PLUGINS_START: (options: PluginsStartOptions) => options,
  PLUGINS_RESULT: (result: Asset) => result,
}
export type SharedEvent = EventFrom<typeof sharedEventModel>
export const sharedEventModel = createModel(
  {},
  { events: sharedEventCreators },
)
