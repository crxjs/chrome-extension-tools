import { normalizePath } from '@rollup/pluginutils'
import { ChangeEvent } from 'rollup'
import { EventFrom } from 'xstate'
import { createModel } from 'xstate/lib/model'
import {
  Asset,
  BaseAsset,
  CompleteFile,
  FileType,
  PluginsStartOptions,
  Script,
} from './types'

export const fileTypes: FileType[] = [
  'CSS',
  'HTML',
  'IMAGE',
  'JSON',
  'MANIFEST',
  'RAW',
  'MODULE',
  'BACKGROUND',
  'CONTENT',
]

export const isScript = (file: {
  fileType: string
}): file is Script =>
  file.fileType === 'BACKGROUND' ||
  file.fileType === 'CONTENT' ||
  file.fileType === 'MODULE'

export const sharedEventCreators = {
  ROOT: (root: string) => ({ root }),
  /** All paths are normalized here to use posix */
  ADD_FILE: ({ fileName, id, ...rest }: BaseAsset | Script) => ({
    fileName: normalizePath(fileName),
    id: normalizePath(id),
    ...rest,
  }),
  EXCLUDE_FILE: (fileType: FileType) => ({ fileType }),
  FILE_DONE: (file: CompleteFile) => ({ file }),
  FILE_READY: (id: string) => ({ id }),
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
