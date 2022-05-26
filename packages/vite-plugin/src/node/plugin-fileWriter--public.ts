import { CrxPluginFn } from './types'
import glob from 'fast-glob'
import { ResolvedConfig } from 'vite'
import { relative } from './path'
import { readFile } from 'fs-extra'

export const pluginFileWriterPublic: CrxPluginFn = () => {
  let config: ResolvedConfig
  return {
    name: 'crx:file-writer-public',
    apply: 'build',
    configResolved(_config) {
      config = _config
    },
    async buildStart() {
      if (this.meta.watchMode) {
        // rebuild when files in public dir are added or changed
        // Rollup feature PR: https://github.com/rollup/rollup/pull/3812
        this.addWatchFile(config.publicDir)
        const publicFiles = await glob(`${config.publicDir}/**/*`)
        for (const file of publicFiles) {
          const source = await readFile(file)
          const fileName = relative(config.publicDir, file)
          this.emitFile({ type: 'asset', fileName, source })
        }
      }
    },
  }
}
