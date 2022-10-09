import contentHmrPort from 'client/es/hmr-content-port.ts?client'
import { filter, Subscription } from 'rxjs'
import { ViteDevServer } from 'vite'
import {
  contentScripts,
  createDevLoader,
  createProLoader,
} from './contentScripts'
import { add } from './fileWriter'
import { getFileName } from './fileWriter-utilities'
import { basename } from './path'
import { isChangeType } from './RxMap'
import { CrxPluginFn } from './types'
import { contentHmrPortId, preambleId, viteClientId } from './virtualFileIds'

/**
 * Emits content scripts and loaders.
 *
 * #### During build:
 *
 * - This plugin emits content script loaders
 * - `plugin-manifest` emits all entry points (including content scripts)
 *
 * #### During serve:
 *
 * - This plugin emits content scripts and loaders
 */
export const pluginContentScripts: CrxPluginFn = (options) => {
  let server: ViteDevServer
  let { preambleCode, hmrTimeout } = options.contentScripts ?? {}
  let sub = new Subscription()

  return [
    {
      name: 'crx:content-scripts',
      apply: 'build',
      enforce: 'pre',
      generateBundle() {
        // emit content script loaders
        for (const script of contentScripts.values()) {
          if (typeof script.refId === 'undefined')
            throw new Error(`Content script refId is undefined: "${script.id}"`)
          if (script.type === 'module') {
            const fileName = this.getFileName(script.refId)
            script.fileName = fileName
          } else if (script.type === 'loader') {
            const fileName = this.getFileName(script.refId)
            script.fileName = fileName
            const refId = this.emitFile({
              type: 'asset',
              name: getFileName({ type: 'loader', id: basename(script.id) }),
              source: createProLoader({ fileName }),
            })
            script.loaderName = this.getFileName(refId)
          } else if (script.type === 'iife') {
            throw new Error('IIFE content scripts are not implemented')
          }
        }
      },
    },
    {
      name: 'crx:content-scripts',
      apply: 'serve',
      async configureServer(_server) {
        server = _server
        if (
          typeof preambleCode === 'undefined' &&
          server.config.plugins.some(({ name }) =>
            name.toLowerCase().includes('react'),
          )
        ) {
          try {
            // rollup compiles this correctly for cjs output
            const react = await import('@vitejs/plugin-react')
            // auto config for react users
            preambleCode = react.default.preambleCode
          } catch (error) {
            preambleCode = false
          }
        }

        // emit content scripts and loaders
        sub.add(
          contentScripts.change$
            .pipe(filter(isChangeType.set))
            .subscribe(({ value: script }) => {
              const { type, id } = script
              if (type === 'loader') {
                let preamble = { fileName: '' } // no preamble by default
                if (preambleCode)
                  preamble = add({ type: 'module', id: preambleId })
                const client = add({ type: 'module', id: viteClientId })

                const file = add({ type: 'module', id })
                const loader = add({
                  type: 'asset',
                  id: getFileName({ type: 'loader', id }),
                  source: createDevLoader({
                    preamble: preamble.fileName,
                    client: client.fileName,
                    fileName: file.fileName,
                  }),
                })
                script.fileName = loader.fileName
              } else if (type === 'iife') {
                throw new Error('IIFE content scripts are not implemented')
              } else {
                const file = add({ type: 'module', id })
                script.fileName = file.fileName
              }
            }),
        )
      },
      resolveId(source) {
        if (source === preambleId) return preambleId
        if (source === contentHmrPortId) return contentHmrPortId
      },
      load(id) {
        if (id === preambleId && typeof preambleCode === 'string') {
          const defined = preambleCode.replace(/__BASE__/g, server.config.base)
          return defined
        }

        if (id === contentHmrPortId) {
          const defined = contentHmrPort.replace(
            '__CRX_HMR_TIMEOUT__',
            JSON.stringify(hmrTimeout),
          )
          return defined
        }
      },
      closeBundle() {
        sub.unsubscribe()
        sub = new Subscription() // can't reuse subscriptions
      },
    },
  ]
}
