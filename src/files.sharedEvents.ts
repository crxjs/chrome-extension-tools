import { normalizePath } from '@rollup/pluginutils'
import { ChangeEvent } from 'rollup'
import { EventFrom } from 'xstate'
import { createModel } from 'xstate/lib/model'
import {
  Asset,
  BaseAsset,
  CompleteFile,
  FileType,
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
  EXCLUDE_FILE_TYPE: (fileType: FileType) => ({ fileType }),
  EMIT_FILE: (
    file: Omit<CompleteFile, 'source' | 'fileId'>,
    children = [] as (BaseAsset | Script)[],
  ) => ({
    file,
    children,
  }),
  SCRIPT_COMPLETE: (id: string) => ({ id }),
  COMPLETE_FILE: (data: {
    id: string
    fileId: string
    source?: string | Uint8Array
  }) => data,
  FILE_ID: (input: { id: string; fileId: string }) => input,
  CHANGE: (id: string, change: { event: ChangeEvent }) => ({
    id,
    ...change,
  }),
  ERROR: (error: unknown) => ({ error }),
  START: (manifest = false) => ({ manifest }),
  PLUGINS_START: (asset: Omit<Required<Asset>, 'fileId'>) =>
    asset,
  PLUGINS_RESULT: (asset: Omit<Required<Asset>, 'fileId'>) =>
    asset,
}
export type SharedEvent = EventFrom<typeof sharedEventModel>
export const sharedEventModel = createModel(
  {},
  { events: sharedEventCreators },
)
