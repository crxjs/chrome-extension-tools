import { CrxPluginFn } from './types'
import glob from 'fast-glob'
import { ResolvedConfig } from 'vite'
import { relative } from './path'
import { promises as fs } from 'fs'
const { readFile } = fs

export const pluginFileWriterPublicDir: CrxPluginFn = () => {
  let config: ResolvedConfig
  return {
    name: 'crx:file-writer-public-dir',
    apply: 'build',
    configResolved(_config) {
      config = _config
    },
    async buildStart() {
      // rebuild when files in public dir are added or changed
      // Rollup feature PR: https://github.com/rollup/rollup/pull/3812
      const publicFiles = await glob(`${config.publicDir}/**/*`)
      for (const file of publicFiles) {
        const source = await readFile(file)
        const fileName = relative(config.publicDir, file)
        this.emitFile({ type: 'asset', fileName, source })
      }
    },
  }
}
