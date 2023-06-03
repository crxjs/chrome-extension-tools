import contentHmrPort from 'client/es/hmr-content-port.ts'
import { filter, Subscription } from 'rxjs'
import { ViteDevServer } from 'vite'
import {
  contentScripts,
  createDevLoader,
  createProLoader,
} from './contentScripts'
import { add } from './fileWriter'
import { formatFileData, getFileName } from './fileWriter-utilities'
import { getOptions } from './plugin-optionsProvider'
import { basename } from './path'
import { RxMap } from './RxMap'
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
export const pluginContentScripts: CrxPluginFn = () => {
  let server: ViteDevServer
  let preambleCode: string | false | undefined
  let hmrTimeout: number | undefined
  let sub = new Subscription()

  return [
    {
      name: 'crx:content-scripts',
      apply: 'serve',
      async config(config) {
        const { contentScripts = {} } = await getOptions(config)
        hmrTimeout = contentScripts.hmrTimeout ?? 5000
        preambleCode = preambleCode ?? contentScripts.preambleCode
      },
      async configureServer(_server) {
        server = _server
        if (
          typeof preambleCode === 'undefined' &&
          server.config.plugins.some(
            ({ name = 'none' }) =>
              name.toLowerCase().includes('react') &&
              !name.toLowerCase().includes('preact'),
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
            .pipe(filter(RxMap.isChangeType.set))
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
    {
      name: 'crx:content-scripts',
      apply: 'build',
      enforce: 'pre',
      config(config) {
        return {
          ...config,
          build: {
            ...config.build,
            rollupOptions: {
              ...config.build?.rollupOptions,
              // keep exports for content script module api
              preserveEntrySignatures:
                config.build?.rollupOptions?.preserveEntrySignatures ??
                'exports-only',
            },
          },
        }
      },
      generateBundle() {
        // emit content script loaders
        for (const [key, script] of contentScripts)
          if (key === script.refId) {
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
            // trigger update for other key values
            contentScripts.set(script.refId, formatFileData(script))
          }
      },
    },
  ]
}
