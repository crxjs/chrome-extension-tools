import { Assigner } from 'xstate'
import {
  FileEvent,
  isJsonAsset,
  isManifestAsset,
  isRawAsset,
  isStringAsset,
  JsonAsset,
  ManifestAsset,
  RawAsset,
  StringAsset,
} from './file.model'
import { format, isUndefined } from './helpers'
import { narrowEvent } from './helpers-xstate'

export const stringFileAssigner: Assigner<
  StringAsset,
  FileEvent
> = (context, event) => {
  const { file } = narrowEvent(event, 'READY')

  if (isStringAsset(file)) return { ...context, ...file }

  throw new TypeError(format`Unexpected file type, expected StringAsset:
                             ${file.id}`)
}

export const rawFileAssigner: Assigner<RawAsset, FileEvent> = (
  context,
  event,
) => {
  const { file } = narrowEvent(event, 'READY')

  if (isRawAsset(file)) return { ...context, ...file }

  throw new TypeError(format`Unexpected file type, expected RawAsset:
                             ${file.id}`)
}

export const manifestFileAssigner: Assigner<
  ManifestAsset,
  FileEvent
> = (context, event) => {
  const { file } = narrowEvent(event, 'READY')

  if (isManifestAsset(file)) return { ...context, ...file }

  throw new TypeError(format`Unexpected file type, expected ManifestAsset:
                             ${file.id}`)
}

export const jsonFileAssigner: Assigner<JsonAsset, FileEvent> = (
  context,
  event,
) => {
  const { file } = narrowEvent(event, 'READY')

  if (isJsonAsset(file)) return { ...context, ...file }

  throw new TypeError(format`Unexpected file type, expected JsonAsset:
                             ${file.id}`)
}
