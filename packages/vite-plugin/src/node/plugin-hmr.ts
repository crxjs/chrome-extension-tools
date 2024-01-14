import { Subscription } from 'rxjs'
import { HMRPayload, ResolvedConfig } from 'vite'
import { contentScripts } from './contentScripts'
import { manifestFiles } from './files'
import { update } from './fileWriter'
import { crxHMRPayload$, hmrPayload$ } from './fileWriter-hmr'
import { fileWriterError$ } from './fileWriter-rxjs'
import { getFileName, prefix } from './fileWriter-utilities'
import { _debug } from './helpers'
import { isImporter } from './isImporter'
import { isAbsolute, join } from './path'
import type { CrxHMRPayload, CrxPluginFn, ManifestFiles } from './types'
import findCSSImportDeps from './findCSSImportDeps'

const debug = _debug('hmr')

export const crxRuntimeReload: CrxHMRPayload = {
  type: 'custom',
  event: 'crx:runtime-reload',
}

export const pluginHMR: CrxPluginFn = () => {
  let inputManifestFiles: ManifestFiles
  let decoratedSend: ((payload: HMRPayload) => void) | undefined
  let config: ResolvedConfig
  let subs: Subscription

  return [
    {
      name: 'crx:hmr',
      apply: 'serve',
      enforce: 'pre',
      // server hmr host should be localhost
      async config({ server = {}, ...config }) {
        if (server.hmr === false) return
        if (server.hmr === true) server.hmr = {}
        server.hmr = server.hmr ?? {}
        server.hmr.host = 'localhost'

        return { server, ...config }
      },
      // server should ignore outdir
      configResolved(_config) {
        config = _config
        const { watch = {} } = config.server
        config.server.watch = watch
        watch.ignored = watch.ignored
          ? [...new Set([watch.ignored].flat())]
          : []
        const outDir = isAbsolute(config.build.outDir)
          ? config.build.outDir
          : join(config.root, config.build.outDir, '**/*')
        if (!watch.ignored.includes(outDir)) watch.ignored.push(outDir)
      },
      configureServer(server) {
        if (server.ws.send !== decoratedSend) {
          // decorate server websocket send method
          const { send } = server.ws
          decoratedSend = (payload: HMRPayload) => {
            if (payload.type === 'error') {
              send({
                type: 'custom',
                event: 'crx:content-script-payload',
                data: payload,
              })
            } else {
              hmrPayload$.next(payload) // sniff hmr events
            }

            send(payload) // don't interfere with normal hmr
          }
          server.ws.send = decoratedSend

          subs = new Subscription(() => (subs = new Subscription()))
          subs.add(fileWriterError$.subscribe(send))
          subs.add(
            crxHMRPayload$.subscribe((payload) => {
              send(payload) // send crx hmr and error events
            }),
          )
        }
      },

      closeBundle() {
        subs.unsubscribe()
      },

      // background changes require a full extension reload
      handleHotUpdate({ modules, server }) {
        const updateFiles = modules
          .filter((module) => module.isSelfAccepting)
          .map((module) => prefix('/', module.url))

        /**
         * Additionally check for CSS importers, since a PostCSS plugin like
         * Tailwind JIT may register any file as a dependency to a CSS file.
         * https://github.com/vitejs/vite/blob/main/packages/vite/src/node/server/hmr.ts#L266
         */
        const additionalCSSFiles = modules
          .flatMap((module) => [...findCSSImportDeps(module)])
          .map((module) => module.url)

        if (inputManifestFiles.background.length) {
          const background = prefix('/', inputManifestFiles.background[0])
          // check if changed file is a background dependency
          const isDependency = modules.some(
            isImporter(join(server.config.root, background)),
          )
          if (
            updateFiles.includes(background) ||
            additionalCSSFiles.length ||
            isDependency
          ) {
            debug('sending runtime reload')
            server.ws.send(crxRuntimeReload)
          }
        }

        for (const [key, script] of contentScripts)
          if (key === script.id) {
            // check if changed file is a content script dependency
            const isDependency = modules.some(
              isImporter(join(server.config.root, script.id)),
            )
            if (
              updateFiles.includes(script.id) ||
              additionalCSSFiles.length ||
              isDependency
            ) {
              new Set([...updateFiles, ...additionalCSSFiles]).forEach(update)
            }
          }
      },
    },
    {
      name: 'crx:hmr',
      apply: 'serve',
      enforce: 'post',
      // get final output manifest for handleHotUpdate 👆
      async transformCrxManifest(manifest) {
        inputManifestFiles = await manifestFiles(manifest, { cwd: config.root })
        return null
      },
      renderCrxDevScript(code, { id: _id, type }) {
        if (
          type === 'module' &&
          _id !== '/@vite/client' &&
          code.includes('createHotContext')
        ) {
          const id = _id.replace(/t=\d+&/, '')
          const escaped = id.replace(/([?&.])/g, '\\$1')
          // using lookahead and lookbehind
          const regexp = new RegExp(
            `(?<=createHotContext\\(")${escaped}(?="\\))`,
          )
          const fileUrl = prefix('/', getFileName({ id, type }))
          const replaced = code.replace(regexp, fileUrl)
          return replaced
        } else {
          return code
        }
      },
    },
  ]
}
