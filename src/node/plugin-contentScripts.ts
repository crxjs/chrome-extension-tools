import contentHmrPort from 'client/es/hmr-content-port.ts?client'
import contentDevLoader from 'client/iife/content-dev-loader.ts?client'
import contentProLoader from 'client/iife/content-pro-loader.ts?client'
import { ViteDevServer } from 'vite'
import { parse } from './path'
import { dynamicScripts } from './plugin-dynamicScripts'
import type { CrxPluginFn } from './types'
import { contentHmrPortId, preambleId } from './virtualFileIds'

// const debug = _debug('crx:hmr')

/** Responsible for emitting content script loaders and resolving associated files */
export const pluginContentScripts: CrxPluginFn = ({
  contentScripts: options = {},
}) => {
  let port: string
  let server: ViteDevServer

  let { preambleCode, hmrTimeout = 5000 } = options
  let preambleRefId: string
  let contentClientRefId: string

  return [
    {
      name: 'crx:content-scripts-pre',
      apply: 'build',
      enforce: 'pre',
      fileWriterStart(_server) {
        server = _server
        port = server.config.server.port!.toString()
      },
      async buildStart() {
        if (this.meta.watchMode) {
          if (
            typeof preambleCode === 'undefined' &&
            process.env.NODE_ENV !== 'test'
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

          if (preambleCode) {
            preambleRefId = this.emitFile({
              type: 'chunk',
              id: preambleId,
              name: 'content-script-preamble.js',
            })
          }

          contentClientRefId = this.emitFile({
            type: 'chunk',
            id: '/@vite/client',
            name: 'content-script-client.js',
          })
        }
      },
      resolveId(source) {
        if (source === preambleId) return preambleId
        if (source === contentHmrPortId) {
          return contentHmrPortId
        }
      },
      load(id) {
        if (server && id === preambleId && typeof preambleCode === 'string') {
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
    },
    {
      name: 'crx:content-scripts-post',
      apply: 'build',
      enforce: 'post',
      renderCrxManifest(manifest, bundle) {
        if (this.meta.watchMode && typeof port === 'undefined')
          throw new Error('server port is undefined')

        const preambleName = preambleRefId
          ? this.getFileName(preambleRefId)
          : ''
        const contentClientName = contentClientRefId
          ? this.getFileName(contentClientRefId)
          : ''

        if (!manifest.content_scripts?.length && !dynamicScripts.size) {
          delete bundle[contentClientName]
          return manifest
        }

        /* --------- APPLY DECLARED SCRIPT LOADERS --------- */

        manifest.content_scripts = manifest.content_scripts?.map(
          ({ js, ...rest }) => ({
            js: js?.map((f: string) => {
              const name = `content-script-loader.${parse(f).name}.js`
              const source = this.meta.watchMode
                ? contentDevLoader
                    .replace(/__PREAMBLE__/g, JSON.stringify(preambleName))
                    .replace(/__CLIENT__/g, JSON.stringify(contentClientName)!)
                    .replace(/__SCRIPT__/g, JSON.stringify(f))
                    .replace(/__TIMESTAMP__/g, JSON.stringify(Date.now()))
                : contentProLoader.replace(/__SCRIPT__/g, JSON.stringify(f))

              const refId = this.emitFile({
                type: 'asset',
                name,
                source,
              })

              return this.getFileName(refId)
            }),
            ...rest,
          }),
        )

        /* ---------- APPLY DYNAMIC SCRIPT LOADERS --------- */

        for (const [id, { chunkId, refId, type }] of dynamicScripts) {
          if (!refId) continue // may have been added during build

          const scriptName = this.getFileName(refId)

          let loaderRefId: string | undefined
          if (type === 'iife') {
            // TODO: rebundle as iife script for opaque origins
          } else if (type === 'module') {
            // TODO: main world scripts don't need a loader
          } else if (type === 'script') {
            const source = this.meta.watchMode
              ? contentDevLoader
                  .replace(/__PREAMBLE__/g, JSON.stringify(preambleName))
                  .replace(/__CLIENT__/g, JSON.stringify(contentClientName)!)
                  .replace(/__SCRIPT__/g, JSON.stringify(scriptName))
              : contentProLoader.replace(
                  /__SCRIPT__/g,
                  JSON.stringify(scriptName),
                )

            loaderRefId = this.emitFile({
              type: 'asset',
              name: `content-script-loader.${parse(scriptName).name}.js`,
              source,
            })
          } else {
            throw new Error(`Unknown script type: "${type}" (${id})`)
          }

          dynamicScripts.set(id, {
            chunkId,
            fileName: this.getFileName(loaderRefId ?? refId),
            refId,
            type,
          })
        }

        return manifest
      },
    },
  ]
}
