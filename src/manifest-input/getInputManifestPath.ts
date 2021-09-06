import { existsSync } from 'fs'
import { basename } from 'path'
import { InputOptions } from 'rollup'
import { isString, isUndefined } from '../helpers'
import { ManifestInputPluginCache } from '../types'
import { cloneObject } from './cloneObject'

const isManifestFileName = (filename: string) =>
  basename(filename).startsWith('manifest')

const validateFileName = (
  filename: string,
  { input }: InputOptions,
) => {
  if (isUndefined(filename))
    throw new Error(
      `Could not find manifest in Rollup options.input: ${JSON.stringify(
        input,
      )}`,
    )
  if (!existsSync(filename))
    throw new Error(
      `Could not load manifest: ${filename} does not exist`,
    )

  return filename
}

export function getInputManifestPath(
  options: InputOptions,
): Partial<
  Pick<ManifestInputPluginCache, 'inputAry' | 'inputObj'>
> & {
  inputManifestPath: string
} {
  if (Array.isArray(options.input)) {
    const manifestIndex = options.input.findIndex(
      isManifestFileName,
    )
    const inputAry = [
      ...options.input.slice(0, manifestIndex),
      ...options.input.slice(manifestIndex + 1),
    ]
    const inputManifestPath = validateFileName(
      options.input[manifestIndex],
      options,
    )

    return { inputManifestPath, inputAry }
  } else if (typeof options.input === 'object') {
    const inputManifestPath = validateFileName(
      options.input.manifest,
      options,
    )
    const inputObj = cloneObject(options.input)
    delete inputObj['manifest']

    return { inputManifestPath, inputObj }
  } else if (isString(options.input)) {
    const inputManifestPath = validateFileName(
      options.input,
      options,
    )
    return { inputManifestPath }
  }

  throw new TypeError(
    `Rollup options.input cannot be type "${typeof options.input}"`,
  )
}
