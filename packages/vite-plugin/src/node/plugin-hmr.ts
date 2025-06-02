import { HMRPayload, ResolvedConfig } from 'vite'
import { contentScripts } from './contentScripts'
import { manifestFiles } from './files'
import { prefix } from './fileWriter-utilities'
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
  let config: ResolvedConfig

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
            }

            send(payload) // don't interfere with normal hmr
          }
          server.ws.send = decoratedSend
        }
      },
      // background changes require a full extension reload
      handleHotUpdate({ modules, server }) {
        const { root } = server.config

        const relFiles = new Set<string>()
        const fsFiles = new Set<string>()
        for (const m of modules) {
          if (m.id?.startsWith(root)) {
            relFiles.add(m.id.slice(server.config.root.length))
          } else if (m.url?.startsWith('/@fs')) {
            fsFiles.add(m.url)
          }
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
          }
        }

        for (const [key, script] of contentScripts)
          if (key === script.id) {
            // check if changed file is a content script dependency
            if (
              relFiles.has(script.id) ||
              modules.some(isImporter(join(server.config.root, script.id)))
            ) {
              // no need to update since no fileWriter
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
      // remove this since no fileWriter
    },
  ]
}
