import path from 'path'
import { OutputBundle } from 'rollup'
import { Plugin } from 'rollup'
import { isChunk } from '../helpers'

export const resolveFromBundle = (
  bundle: OutputBundle,
): Plugin => ({
  name: 'resolve-from-bundle',
  resolveId(source, importer) {
    if (typeof importer === 'undefined') {
      return source
    } else {
      const dirname = path.dirname(importer)
      const resolved = path.join(dirname, source)

      return resolved
    }
  },
  load(id) {
    const chunk = bundle[id]

    if (isChunk(chunk)) {
      return {
        code: chunk.code,
        map: chunk.map,
      }
    } else {
      throw new Error(`Could not load: ${id}`)
    }
  },
})
