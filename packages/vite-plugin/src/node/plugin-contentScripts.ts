import contentHmrPort from 'client/es/hmr-content-port.ts'
import { filter, Subscription } from 'rxjs'
import type { OutputBundle, PluginContext } from 'rollup'
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
import { getCrxHmrToken } from './hmrToken'
import { getOptions } from './plugin-optionsProvider'
import { basename, dirname, relative } from './path'
import { RxMap } from './RxMap'
import { CrxPluginFn, ResolvedConfigWithHMRToken } from './types'
import { contentHmrPortId, preambleId, viteClientId } from './virtualFileIds'
import colors from 'picocolors'

function asRelativeImport(fromFileName: string, toFileName: string) {
  const path = relative(dirname(fromFileName), toFileName)
  return path.startsWith('.') ? path : `./${path}`
}

function getExternallyConnectableMatch(match: string) {
  if (match === '<all_urls>') return null

  const parsed = /^(\*|https?):\/\/([^/]+)\/.*$/.exec(match)
  if (!parsed) return null

  const [, , host] = parsed
  if (host === '*') return null

  return match
}

function getExternallyConnectableMatches(matches: string[]) {
  const result = new Set<string>()
  const unsupported = new Set<string>()

  for (const match of matches) {
    const externallyConnectableMatch = getExternallyConnectableMatch(match)
    if (externallyConnectableMatch) {
      result.add(externallyConnectableMatch)
    } else {
      unsupported.add(match)
    }
  }

  return {
    matches: [...result],
    unsupported: [...unsupported],
  }
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
  let preambleCode: string | false | undefined
  let hmrTimeout: number | undefined
  let liveReload = true
  let sub = new Subscription()

  const worldMainIds = new Set<string>()
  const worldMainExternallyConnectableMatches = new Set<string>()
  const unsupportedWorldMainExternallyConnectableMatches = new Set<string>()

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
    ;(manifest.content_scripts || []).forEach(({ world, matches = [] }) => {
      if (world === 'MAIN') {
        const externallyConnectable = getExternallyConnectableMatches(matches)
        externallyConnectable.matches.forEach((match) =>
          worldMainExternallyConnectableMatches.add(match),
        )
        externallyConnectable.unsupported.forEach((match) =>
          unsupportedWorldMainExternallyConnectableMatches.add(match),
        )
      }
    })
  }

  const warnUnsupportedWorldMainExternallyConnectableMatches = () => {
    if (unsupportedWorldMainExternallyConnectableMatches.size === 0) return

    const name = `[${pluginName}]`
    const message = colors.yellow(
      [
        `${name} MAIN world HMR requires externally_connectable.matches. CRX cannot auto-add these Chrome-rejected content-script match patterns:`,
        ...[...unsupportedWorldMainExternallyConnectableMatches].map(
          (match) => `  ${match}`,
        ),
        'Add explicit http(s) host addresses to your content script matches during development if you want MAIN world HMR for those pages.',
      ].join('\r\n'),
    )
    console.warn(message)
  }

  return [
    {
      name: pluginName,
      apply: 'serve',
      async config(config, env) {
        await findWorldMainIds(config, env)
        warnUnsupportedWorldMainExternallyConnectableMatches()
        const opts = await getOptions(config)
        const { contentScripts = {} } = opts
        hmrTimeout = contentScripts.hmrTimeout ?? 5000
        preambleCode = preambleCode ?? contentScripts.preambleCode
        liveReload = opts.liveReload !== false
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
          } catch {
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
                const loaderFileName = getFileName({ type: 'loader', id })
                const loader = add({
                  type: 'asset',
                  id: loaderFileName,
                  source: worldMainIds.has(file.id)
                    ? createDevMainLoader({
                        preamble: preamble.fileName
                          ? asRelativeImport(loaderFileName, preamble.fileName)
                          : '',
                        client: asRelativeImport(
                          loaderFileName,
                          client.fileName,
                        ),
                        fileName: asRelativeImport(
                          loaderFileName,
                          file.fileName,
                        ),
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
          const defined = contentHmrPort
            .replace('__CRX_HMR_TIMEOUT__', JSON.stringify(hmrTimeout))
            .replace('__CRX_LIVE_RELOAD__', JSON.stringify(liveReload))
            .replace(
              '__CRX_HMR_TOKEN__',
              JSON.stringify(
                getCrxHmrToken(server.config as ResolvedConfigWithHMRToken),
              ),
            )
          return defined
        }
      },
      closeBundle() {
        sub.unsubscribe()
        sub = new Subscription() // can't reuse subscriptions
      },
      transformCrxManifest(manifest) {
        if (worldMainExternallyConnectableMatches.size === 0) return null

        manifest.externally_connectable = manifest.externally_connectable ?? {}
        manifest.externally_connectable.matches = [
          ...new Set([
            ...(manifest.externally_connectable.matches ?? []),
            ...worldMainExternallyConnectableMatches,
          ]),
        ]

        return manifest
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
      generateBundle(_options, bundle) {
        finalizeBuildContentScripts(this, bundle, worldMainIds)
      },
    },
  ]
}

/**
 * Resolve build-time content script filenames and emit production loaders.
 *
 * This is intentionally idempotent. It can run from both `crx:content-scripts`
 * and `crx:manifest` because dynamic script placeholders and manifest filename
 * replacement happen in different post-build hooks across Vite versions.
 */
export function finalizeBuildContentScripts(
  context: Pick<PluginContext, 'emitFile' | 'getFileName'>,
  bundle: OutputBundle,
  worldMainIds = new Set<string>(),
) {
  const processed = new Set<object>()

  // emit content script loaders
  for (const [key, script] of contentScripts) {
    if (key !== script.refId || processed.has(script)) continue
    processed.add(script)

    if (script.type === 'module') {
      script.fileName = script.fileName ?? context.getFileName(script.refId)
    } else if (script.type === 'loader') {
      const fileName = script.fileName ?? context.getFileName(script.refId)
      script.fileName = fileName

      const bundleFileInfo = bundle[fileName]
      if (bundleFileInfo?.type !== 'chunk') continue

      // the loader loads scripts asynchronously which in this case needlessly
      // delays content script execution which may not be desired
      const shouldUseLoader = !(
        bundleFileInfo.imports.length === 0 &&
        bundleFileInfo.dynamicImports.length === 0 &&
        bundleFileInfo.exports.length === 0
      )

      if (shouldUseLoader) {
        if (typeof script.loaderName === 'undefined') {
          const refId = context.emitFile({
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

          script.loaderName = context.getFileName(refId)
        }
      } else if (
        typeof script.loaderName === 'undefined' &&
        !bundleFileInfo.code.startsWith('(function(){')
      ) {
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
      // IIFE scripts are handled by plugin-contentScripts_iife
      // Skip processing here - the IIFE plugin builds and emits them
      continue
    }

    // trigger update for other key values
    contentScripts.set(script.refId, formatFileData(script))
  }
}
