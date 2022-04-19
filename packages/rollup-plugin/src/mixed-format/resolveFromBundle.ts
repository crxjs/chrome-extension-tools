import path from 'path'
import { OutputBundle } from 'rollup'
import { Plugin } from 'rollup'
import { isChunk } from '../helpers'

export const resolveFromBundle = (bundle: OutputBundle): Plugin => ({
  name: 'resolve-from-bundle',
  resolveId(source, importer) {
    if (typeof importer === 'undefined') {
      return source
    } else {
      const dirname = path.dirname(importer)
      const resolved = path.join(dirname, source)

      // if it's not in the bundle,
      //   tell Rollup not to try to resolve it
      return resolved in bundle ? resolved : false
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
      // anything not in the bundle is external
      //  this doesn't make sense for a chrome extension,
      //    but we should let Rollup handle it
      return null
    }
  },
})
