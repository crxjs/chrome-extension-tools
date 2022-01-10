import { normalizePath } from '@rollup/pluginutils'
import glob from 'glob'
import { model } from './files.machine'
import { relative } from './path'
import { getRpceAPI } from './plugin_helpers'
import { BaseAsset, CrxPlugin } from './types'

const pGlob = (
  pattern: string,
  options?: glob.IGlob,
): Promise<string[]> =>
  new Promise((resolve, reject) => {
    options
      ? glob(pattern, options, (err, matches) => {
          if (err) reject(err)
          else resolve(matches)
        })
      : glob(pattern, (err, matches) => {
          if (err) reject(err)
          else resolve(matches)
        })
  })

/**
 * Copy the contents of the public folder
 *
 * This feature is only supported in Vite
 */
export const publicDir = (): CrxPlugin => {
  return {
    name: 'public-dir',
    async configResolved(config) {
      if (!config.publicDir) return
      const { service } = getRpceAPI(config.plugins)

      const matches = await pGlob(`${config.publicDir}/**/*`)
      const files = matches.map((id): BaseAsset => {
        const fileName = relative(
          config.publicDir,
          normalizePath(id),
        )
        return { fileName, id, fileType: 'RAW' }
      })

      service.send(model.events.ADD_FILES(files))
    },
  }
}
