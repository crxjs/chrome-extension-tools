import { HMRPayload, ModuleNode } from 'vite'
import { manifestFiles, _debug } from './helpers'
import { crxHmrPayload$, hmrPayload$ } from './hmrPayload'
import { isAbsolute, join } from './path'
import type { CrxHMRPayload, CrxPluginFn, ManifestFiles } from './types'

const debug = _debug('hmr')

export const crxRuntimeReload: CrxHMRPayload = {
  type: 'custom',
  event: 'crx:runtime-reload',
}

export const pluginHMR: CrxPluginFn = () => {
  let files: ManifestFiles
  let decoratedSend: ((payload: HMRPayload) => void) | undefined

  return [
    {
      name: 'crx:hmr',
      apply: 'build',
      enforce: 'post',
      async renderCrxManifest(manifest) {
        if (this.meta.watchMode) {
          files = await manifestFiles(manifest)
        }
        return null
      },
    },
    {
      name: 'crx:hmr',
      apply: 'serve',
      enforce: 'pre',
      config({ server = {}, ...config }) {
        if (server.hmr === false) return
        if (server.hmr === true) server.hmr = {}
        server.hmr = server.hmr ?? {}
        server.hmr.host = 'localhost'

        return { server, ...config }
      },
      configResolved(config) {
        const { watch = {} } = config.server
        config.server.watch = watch
        watch.ignored = watch.ignored
          ? [...new Set([watch.ignored].flat())]
          : []
        const outDir = isAbsolute(config.build.outDir)
          ? config.build.outDir
          : join(config.root, config.build.outDir, '**/*')
        watch.ignored.push(outDir)
      },
      configureServer(server) {
        if (server.ws.send !== decoratedSend) {
          // decorate server websocket send method
          const { send } = server.ws
          decoratedSend = (payload: HMRPayload) => {
            hmrPayload$.next(payload) // sniff hmr events
            send(payload) // don't interfere with normal hmr
          }
          server.ws.send = decoratedSend
          crxHmrPayload$.subscribe((payload) => {
            send(payload) // send crx hmr events
          })
        }
      },
      handleHotUpdate({ file, modules, server }) {
        const background =
          files.background[0] && join(server.config.root, files.background[0])

        // check that the changed file is not a background dependency
        if (background)
          if (file === background || modules.some(isImporter(background))) {
            debug('sending runtime reload')
            server.ws.send(crxRuntimeReload)
            return []
          }
      },
    },
  ]
}

/** Determine if a changed file was imported by a file */
function isImporter(file: string) {
  const seen = new Set<ModuleNode>()
  const pred = (changedNode: ModuleNode): boolean => {
    seen.add(changedNode)

    if (changedNode.file === file) return true
    // crawl back up the dependency tree
    for (const parentNode of changedNode.importers) {
      // check each node once to handle shared files
      const unseen = !seen.has(parentNode)
      if (unseen && pred(parentNode)) return true
    }

    return false
  }
  return pred
}
