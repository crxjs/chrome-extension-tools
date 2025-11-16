import contentHmrPort from 'client/es/hmr-content-port.ts'
import { filter, Subscription } from 'rxjs'
import { ConfigEnv, UserConfig, ViteDevServer } from 'vite'
import {
  contentScripts,
  createDevLoader,
  createDevMainLoader,
  createProLoader,
  createProMainLoader,
} from './contentScripts'
import { add } from './fileWriter'
import { formatFileData, getFileName, prefix } from './fileWriter-utilities'
import { getOptions } from './plugin-optionsProvider'
import { basename } from './path'
import { RxMap } from './RxMap'
import { CrxPluginFn } from './types'
import { contentHmrPortId, preambleId, viteClientId } from './virtualFileIds'
import colors from 'picocolors';

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
  const pluginName = 'crx:content-scripts';

  let server: ViteDevServer
  let preambleCode: string | false | undefined
  let hmrTimeout: number | undefined
  let sub = new Subscription()

  const worldMainIds = new Set<string>();

  const findWorldMainIds = async (config: UserConfig, env: ConfigEnv) => {
    const { manifest: _manifest } = await getOptions(config)

    const manifest = await (typeof _manifest === 'function'
      ? _manifest(env)
      : _manifest);

    (manifest.content_scripts || []).forEach(({ world, js }) => {
      if (world === 'MAIN' && js) {
        js.forEach((path) => worldMainIds.add(prefix('/', path)))
      }
    })

    if (worldMainIds.size) {
      const name = `[${pluginName}]`
      const message = colors.yellow(
        [
          `${name} Some content-scripts don't support HMR because the world is MAIN:`,
          ...[...worldMainIds].map((id) => `  ${id}`),
        ].join('\r\n'),
      )
      console.log(message)
    }
  }

  return [
    {
      name: pluginName,
      apply: 'serve',
      async config(config, env) {
        await findWorldMainIds(config, env);
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
                  source: worldMainIds.has(file.id)
                    ? createDevMainLoader({
                      fileName: `./${file.fileName.split('/').at(-1)}`
                    })
                    : createDevLoader({
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
      name: pluginName,
      apply: 'build',
      enforce: 'pre',
      async config(config, env) {
        await findWorldMainIds(config, env);

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
      generateBundle(_options, bundle) {
        // emit content script loaders
        for (const [key, script] of contentScripts)
          if (key === script.refId) {
            if (script.type === 'module') {
              const fileName = this.getFileName(script.refId)
              script.fileName = fileName
            } else if (script.type === 'loader') {
              const fileName = this.getFileName(script.refId)
              script.fileName = fileName

              const bundleFileInfo = bundle[fileName]
              // the loader loads scripts asynchronously which in this case needlessly
              // delays content script execution which may not be desired
              const shouldUseLoader = !(
                bundleFileInfo.type === 'chunk' &&
                bundleFileInfo.imports.length === 0 &&
                bundleFileInfo.dynamicImports.length === 0 &&
                bundleFileInfo.exports.length === 0
              )

              if (shouldUseLoader) {
                const refId = this.emitFile({
                  type: 'asset',
                  name: getFileName({
                    type: 'loader',
                    id: basename(script.id),
                  }),
                  source: worldMainIds.has(script.id)
                    ? createProMainLoader({ fileName: `./${fileName.split('/').at(-1)}` })
                    : createProLoader({ fileName }),
                })

                script.loaderName = this.getFileName(refId)
              } else {
                // make sure the code is wrapped in a function invocation
                // to have the same scope isolation as the loader provides
                //
                // note that loaders may also call an `onExecute` function
                // if exported by the content script, but given we
                // require content scripts in this branch to have no exports
                // there is obviously no need to handle onExecute() here
                bundleFileInfo.code = `(function(){${bundleFileInfo.code}})()\n`
              }
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
