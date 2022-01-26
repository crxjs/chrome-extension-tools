// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { code as browserPolyfillExecuteScriptJs } from 'code ./browser/code-executeScriptPolyfill.ts'
import { readFileSync, readJsonSync } from 'fs-extra'
import { relative } from './path'
import { format } from './helpers'
import { isMV2, CrxPlugin } from './types'

export const browserPolyfillName = 'browser-polyfill.js'
export const browserPolyfillExecuteScriptName =
  'browser-polyfill-executeScript.js'

export const browserPolyfill = (): CrxPlugin => {
  const convert = require('convert-source-map')
  const polyfillPath = require.resolve('webextension-polyfill')
  const src = readFileSync(polyfillPath, 'utf-8')
  const map = readJsonSync(polyfillPath + '.map')

  const browserPolyfillJs = [
    convert.removeMapFileComments(src),
    convert.fromObject(map).toComment(),
  ].join('\n')

  let mv3 = false
  let root = process.cwd()
  const fileNames = new Set<string>()

  return {
    name: 'browser-polyfill',
    crx: true,
    buildStart({ plugins }) {
      const { api } = plugins.find(
        ({ name }) => name === 'chrome-extension',
      )!
      root = api.root
    },
    renderCrxManifest(manifest) {
      if (isMV2(manifest)) {
        if (manifest.background?.scripts) {
          manifest.background.scripts.forEach((script) =>
            fileNames.add(script),
          )
          manifest.background.scripts.unshift(
            browserPolyfillName,
            browserPolyfillExecuteScriptName,
          )
        }
      } else {
        mv3 = true
      }

      if (manifest.background) {
        this.emitFile({
          type: 'asset',
          source: browserPolyfillJs,
          fileName: browserPolyfillName,
        })
        this.emitFile({
          type: 'asset',
          source: browserPolyfillExecuteScriptJs,
          fileName: browserPolyfillExecuteScriptName,
        })
      }

      if (manifest.content_scripts?.length)
        manifest.content_scripts = manifest.content_scripts.map(
          ({ js, ...rest }) =>
            Array.isArray(js)
              ? { js: [browserPolyfillName, ...js], ...rest }
              : rest,
        )

      return manifest
    },
    transform(code, id) {
      if (mv3 && fileNames.has(id)) {
        const relPath = relative(root, id)
        const newCode = format`
        import "${relPath}"
        ${code}
        `
        return { code: newCode }
      }

      return null
    },
  }
}
