// import { HMRPayload } from 'vite'
import { HMRPayload } from 'vite'
import { contentScripts } from './contentScripts'
import { manifestFiles } from './files'
import { update } from './fileWriter'
import { crxHMRPayload$, hmrPayload$ } from './fileWriter-hmr'
import { getFileName, prefix } from './fileWriter-utilities'
import { _debug } from './helpers'
import { isImporter } from './isImporter'
import { isAbsolute, join } from './path'
import type { CrxHMRPayload, CrxPluginFn, ManifestFiles } from './types'

const debug = _debug('hmr')

export const crxRuntimeReload: CrxHMRPayload = {
  type: 'custom',
  event: 'crx:runtime-reload',
}

export const pluginHMR: CrxPluginFn = () => {
  let inputManifestFiles: ManifestFiles
  let decoratedSend: ((payload: HMRPayload) => void) | undefined

  return [
    {
      name: 'crx:hmr',
      apply: 'serve',
      enforce: 'pre',
      // server hmr host should be localhost
      config({ server = {}, ...config }) {
        if (server.hmr === false) return
        if (server.hmr === true) server.hmr = {}
        server.hmr = server.hmr ?? {}
        server.hmr.host = 'localhost'

        return { server, ...config }
      },
      // server should ignore outdir
      configResolved(config) {
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
      // TODO: emit hmr payloads for file writer
      configureServer(server) {
        if (server.ws.send !== decoratedSend) {
          // decorate server websocket send method
          const { send } = server.ws
          decoratedSend = (payload: HMRPayload) => {
            hmrPayload$.next(payload) // sniff hmr events
            send(payload) // don't interfere with normal hmr
          }
          server.ws.send = decoratedSend
          crxHMRPayload$.subscribe((payload) => {
            send(payload) // send crx hmr events
          })
        }
      },
      // background changes require a full extension reload
      handleHotUpdate({ modules, server }) {
        const { root } = server.config

        const relFiles = new Set<string>()
        for (const m of modules)
          if (m.id?.startsWith(root)) {
            relFiles.add(m.id.slice(server.config.root.length))
          }

        // check if changed file is a background dependency
        if (inputManifestFiles.background.length) {
          const background = prefix('/', inputManifestFiles.background[0])
          if (
            relFiles.has(background) ||
            modules.some(isImporter(join(server.config.root, background)))
          ) {
            debug('sending runtime reload')
            server.ws.send(crxRuntimeReload)
            return []
          }
        }

        for (const [key, script] of contentScripts)
          if (key === script.id) {
            // check if changed file is a content script dependency
            if (
              relFiles.has(script.id) ||
              modules.some(isImporter(join(server.config.root, script.id)))
            ) {
              relFiles.forEach((relFile) => update(relFile))
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
        inputManifestFiles = await manifestFiles(manifest)
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
