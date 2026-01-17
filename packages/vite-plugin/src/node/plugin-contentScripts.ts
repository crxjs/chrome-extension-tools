import contentHmrPort from 'client/es/hmr-content-port.ts'
import { filter, Subscription } from 'rxjs'
import { OutputAsset, OutputChunk } from 'rollup'
import {
  build as viteBuild,
  ConfigEnv,
  ResolvedConfig,
  UserConfig,
  ViteDevServer,
} from 'vite'
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
import { basename, join } from './path'
import { RxMap } from './RxMap'
import { CrxPluginFn } from './types'
import { contentHmrPortId, preambleId, viteClientId } from './virtualFileIds'
import colors from 'picocolors'

const getIifeGlobalName = (fileName: string) => {
  const base = fileName.split('/').pop() ?? fileName
  const sanitized = base.replace(/\W+/g, '_').replace(/^_+/, '')
  return `crx_${sanitized || 'content_script'}`
}

const resolveScriptInput = (config: ResolvedConfig, id: string) => {
  if (id.startsWith('/@fs/')) return id.slice('/@fs/'.length)
  if (id.startsWith('/')) return join(config.root, id.slice(1))
  return id
}

const isOutputChunk = (item: OutputChunk | OutputAsset): item is OutputChunk =>
  item.type === 'chunk'

const isOutputAsset = (item: OutputChunk | OutputAsset): item is OutputAsset =>
  item.type === 'asset'

const emitAssetToBundle = (
  bundle: Record<string, OutputChunk | OutputAsset>,
  fileName: string,
  source: string | Uint8Array,
) => {
  bundle[fileName] = {
    type: 'asset',
    fileName,
    name: fileName,
    source,
  } as OutputAsset
}

const bundleIifeScript = async (config: ResolvedConfig, scriptId: string) => {
  const input = resolveScriptInput(config, scriptId)

  // Use Vite's build API instead of raw Rollup to avoid plugin compatibility issues
  // (Vite 6+ plugins are tracked in WeakMaps and can't be reused in separate Rollup builds)
  const result = await viteBuild({
    root: config.root,
    mode: config.mode,
    configFile: false, // Don't load user's config - use minimal IIFE-specific settings
    logLevel: 'silent',
    resolve: {
      // Copy resolve settings from the config for consistency
      alias: config.resolve.alias,
      extensions: config.resolve.extensions,
      conditions: config.resolve.conditions,
    },
    build: {
      write: false, // Don't write to disk
      manifest: false, // Don't generate Vite manifest
      rollupOptions: {
        input,
        external: config.build.rollupOptions?.external,
        onwarn: config.build.rollupOptions?.onwarn,
        treeshake: config.build.rollupOptions?.treeshake,
        output: {
          format: 'iife',
          inlineDynamicImports: true, // Required for IIFE format
          name: getIifeGlobalName(scriptId),
          sourcemap: config.build.sourcemap,
        },
      },
      minify: false,
      copyPublicDir: false,
    },
  })

  // viteBuild with write: false returns RollupOutput or RollupOutput[]
  const outputs = Array.isArray(result) ? result : [result]
  const firstOutput = outputs[0]
  const output = 'output' in firstOutput ? firstOutput.output : undefined

  if (!output) {
    throw new Error(`Unable to generate IIFE bundle for "${scriptId}"`)
  }

  return output
}

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
  const pluginName = 'crx:content-scripts'

  let server: ViteDevServer
  let resolvedConfig: ResolvedConfig
  let preambleCode: string | false | undefined
  let hmrTimeout: number | undefined
  let sub = new Subscription()

  const worldMainIds = new Set<string>()

  const findWorldMainIds = async (config: UserConfig, env: ConfigEnv) => {
    const { manifest: _manifest } = await getOptions(config)

    const manifest = await (typeof _manifest === 'function'
      ? _manifest(env)
      : _manifest)

    ;(manifest.content_scripts || []).forEach(({ world, js }) => {
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
        await findWorldMainIds(config, env)
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
                        fileName: `./${file.fileName.split('/').at(-1)}`,
                      })
                    : createDevLoader({
                        preamble: preamble.fileName,
                        client: client.fileName,
                        fileName: file.fileName,
                      }),
                })
                script.fileName = loader.fileName
              } else if (type === 'iife') {
                const file = add({ type: 'iife', id })
                script.fileName = file.fileName
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
        await findWorldMainIds(config, env)

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
      configResolved(_config) {
        resolvedConfig = _config
      },
      async generateBundle(_options, bundle) {
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
                    ? createProMainLoader({
                        fileName: `./${fileName.split('/').at(-1)}`,
                      })
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
              if (!resolvedConfig)
                throw new Error(
                  'Resolved config not available for IIFE scripts',
                )
              const output = await bundleIifeScript(resolvedConfig, script.id)
              const entryChunk = output.find(
                (item): item is OutputChunk =>
                  isOutputChunk(item) && item.isEntry,
              )
              if (!entryChunk) {
                throw new Error(
                  `Unable to generate IIFE content script for "${script.id}"`,
                )
              }

              const esModuleFile = this.getFileName(script.refId)
              if (bundle[esModuleFile]) delete bundle[esModuleFile]

              script.fileName = entryChunk.fileName
              let entryCode = entryChunk.code
              const shouldEmitMap =
                resolvedConfig.build.sourcemap &&
                resolvedConfig.build.sourcemap !== 'inline'
              const shouldAppendMap = resolvedConfig.build.sourcemap === true
              if (entryChunk.map && shouldEmitMap) {
                const mapFileName = `${entryChunk.fileName}.map`
                emitAssetToBundle(
                  bundle,
                  mapFileName,
                  JSON.stringify(entryChunk.map),
                )
                if (shouldAppendMap)
                  entryCode += `\n//# sourceMappingURL=${mapFileName}`
              }

              emitAssetToBundle(bundle, entryChunk.fileName, entryCode)

              for (const item of output) {
                if (isOutputAsset(item)) {
                  if (
                    typeof item.source === 'undefined' ||
                    item.source === null
                  )
                    continue
                  emitAssetToBundle(bundle, item.fileName, item.source)
                } else if (isOutputChunk(item) && !item.isEntry) {
                  emitAssetToBundle(bundle, item.fileName, item.code)
                }
              }
            }
            // trigger update for other key values
            contentScripts.set(script.refId, formatFileData(script))
          }
      },
    },
  ]
}
