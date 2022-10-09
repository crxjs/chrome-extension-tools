import { readFile } from 'fs/promises'
import { ResolvedConfig } from 'vite'
import { dirFiles } from './files'
import { isAbsolute, relative, resolve } from './path'
import { CrxPluginFn } from './types'

export const pluginFileWriterPublic: CrxPluginFn = () => {
  let config: ResolvedConfig
  return {
    name: 'crx:file-writer-public',
    apply: 'serve',
    configResolved(_config) {
      config = _config
    },
    async generateBundle() {
      const publicDir = isAbsolute(config.publicDir)
        ? config.publicDir
        : resolve(config.root, config.publicDir)
      const files = await dirFiles(publicDir)
      for (const filepath of files) {
        const source = await readFile(filepath)
        const fileName = relative(publicDir, filepath)
        this.emitFile({ type: 'asset', source, fileName })
      }
    },
  }
}
