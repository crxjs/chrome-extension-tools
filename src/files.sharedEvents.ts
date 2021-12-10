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

function normalizeFilePaths({
  fileName,
  id,
  ...rest
}: BaseAsset | Script) {
  return {
    fileName: normalizePath(fileName),
    id: normalizePath(id),
    ...rest,
  }
}

export const sharedEventCreators = {
  ABORT: () => ({}),
  BUILD_MANIFEST: () => ({}),
  BUILD_START: () => ({}),
  CHANGE: (id: string, change: { event: ChangeEvent }) => ({
    id,
    ...change,
  }),
  COMPLETE_FILE: (data: {
    id: string
    fileId: string
    source?: string | Uint8Array
  }) => data,
  EMIT_FILE: (
    file: Omit<CompleteFile, 'source' | 'fileId'>,
  ) => ({ file }),
  EMIT_START: (manifest = false) => ({ manifest }),
  ENQUEUE_FILES: (files: (BaseAsset | Script)[]) => ({
    files: files.map(normalizeFilePaths),
  }),
  ERROR: (error: unknown) => ({ error }),
  EXCLUDE_FILE_TYPE: (fileType: FileType) => ({ fileType }),
  FILE_EXCLUDED: (id: string) => ({ id }),
  FILE_ID: (input: { id: string; fileId: string }) => input,
  PARSE_RESULT: (files: (BaseAsset | Script)[]) => ({
    children: [
      ...new Map(files.map((file) => [file.id, file])).values(),
    ],
  }),
  PLUGINS_RESULT: (
    asset: Omit<Required<Asset>, 'fileId' | 'dirName'>,
  ) => asset,
  PLUGINS_START: (
    asset: Omit<Required<Asset>, 'fileId' | 'dirName'>,
  ) => asset,
  READY: (id: string) => ({ id }),
  REMOVE_FILE: (id: string) => ({ id }),
  RENDER_START: () => ({}),
  RENDER_MANIFEST: () => ({}),
  ROOT: (root: string) => ({ root }),
  SCRIPT_COMPLETE: (id: string) => ({ id }),
  SPAWN_FILE: (file: BaseAsset | Script) => ({ file }),
}
export type SharedEvent = EventFrom<typeof sharedEventModel>
export const sharedEventModel = createModel(
  {},
  { events: sharedEventCreators },
)
