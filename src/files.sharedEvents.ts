import { normalizePath } from '@rollup/pluginutils'
import { ChangeEvent } from 'rollup'
import { EventFrom } from 'xstate'
import { createModel } from 'xstate/lib/model'
import {
  Asset,
  BaseAsset,
  EmittedFile,
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
  'SCRIPT_HTML',
  'SCRIPT_BACKGROUND',
  'SCRIPT_DECLARED',
  'SCRIPT_DYNAMIC',
]

export const isScript = (file: {
  fileType: string
}): file is Script =>
  file.fileType === 'SCRIPT_BACKGROUND' ||
  file.fileType === 'SCRIPT_DECLARED' ||
  file.fileType === 'SCRIPT_DYNAMIC' ||
  file.fileType === 'SCRIPT_HTML'

export const isContentScript = (file: EmittedFile) =>
  file.fileType === 'SCRIPT_DECLARED' ||
  file.fileType === 'SCRIPT_DYNAMIC'

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
  ADD_FILES: (files: (BaseAsset | Script)[]) => ({
    files: files.map(normalizeFilePaths),
  }),
  BUILD_MANIFEST: () => ({}),
  BUILD_START: () => ({}),
  CHANGE: (id: string, change: { event: ChangeEvent }) => ({
    id,
    ...change,
  }),
  COMPLETE_FILE: (data: {
    id: string
    refId: string
    source?: string | Uint8Array
  }) => data,
  EMIT_FILE: (
    file: Omit<EmittedFile, 'source' | 'fileId' | 'refId'>,
  ) => ({
    file,
  }),
  EMIT_START: (manifest = false) => ({ manifest }),
  ERROR: (error: unknown) => ({ error }),
  EXCLUDE_FILE_TYPE: (fileType: FileType) => ({ fileType }),
  FILE_EXCLUDED: (id: string) => ({ id }),
  GENERATE_BUNDLE: () => ({}),
  PARSE_RESULT: (
    fileName: string,
    files: (BaseAsset | Script)[],
  ) => ({
    fileName,
    children: [
      ...new Map(files.map((file) => [file.id, file])).values(),
    ],
  }),
  PLUGINS_RESULT: (asset: Omit<Asset, 'refId' | 'dirName'>) =>
    asset,
  PLUGINS_START: (asset: Omit<Asset, 'refId' | 'dirName'>) =>
    asset,
  READY: (id: string) => ({ id }),
  REF_ID: (input: { id: string; fileId: string }) => input,
  REMOVE_FILE: (id: string) => ({ id }),
  RENDER_START: (fileName: string) => ({ fileName }),
  ROOT: (root: string) => ({ root }),
  SCRIPT_COMPLETE: (id: string) => ({ id }),
  SPAWN_FILE: (file: BaseAsset | Script) => ({ file }),
}
export type SharedEvent = EventFrom<typeof sharedEventModel>
export const sharedEventModel = createModel(
  {},
  { events: sharedEventCreators },
)
