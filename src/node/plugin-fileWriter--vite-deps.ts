import { readFileSync } from 'fs-extra'
import MagicString from 'magic-string'
import { idByUrl } from './fileMeta'
import { CrxPluginFn } from './types'
import {
  contentHmrPortId,
  customElementsId,
  viteClientId,
} from './virtualFileIds'

const customElementsPath = require.resolve(customElementsId)
const customElementsCode = readFileSync(customElementsPath, 'utf8')
const customElementsMap = readFileSync(`${customElementsPath}.map`, 'utf8')

export const pluginFileWriterViteDeps: CrxPluginFn = () => {
  return {
    name: 'crx:file-writer-vite-deps',
    apply: 'build',
    enforce: 'pre',
    load(id) {
      if (id === idByUrl.get(customElementsId)) {
        return { code: customElementsCode, map: customElementsMap }
      }
    },
    transform(code, id) {
      if (id === idByUrl.get(viteClientId)) {
        const magic = new MagicString(code)
        magic.prepend(`import '${customElementsId}';`)
        magic.prepend(`import { HMRPort } from '${contentHmrPortId}';`)
        const ws = 'new WebSocket'
        const index = code.indexOf(ws)
        magic.overwrite(index, index + ws.length, 'new HMRPort')
        return { code: magic.toString(), map: magic.generateMap() }
      }
    },
  }
}
