import {
  filter,
  map,
  mergeMap,
  Observable,
  Subject,
  takeLast,
  window,
  withLatestFrom,
} from 'rxjs'
import { HMRPayload, ModuleNode } from 'vite'
import { manifestFiles } from './helpers'
import { filesReady$ } from './plugin-fileWriter--events'
import type { CrxHMRPayload, CrxPluginFn, ManifestFiles } from './types'

export const workerClientId = '@crx/client/worker'
export const contentClientId = '@crx/client/content'

/** Determine if a file was imported by a module or a parent module */
function isImporter(file: string) {
  const pred = (node: ModuleNode) => {
    if (node.file === file) return true
    for (const node2 of node.importers) if (pred(node2)) return true
  }
  return pred
}

function isCrxHMRPayload(x: HMRPayload): x is CrxHMRPayload {
  return x.type === 'custom' && x.event.startsWith('crx:')
}

const hmrPayload$ = new Subject<HMRPayload>()
/**
 * Buffer hmrPayloads by filesReady
 *
 * What about assets and manifest?
 */
export const crxHmrPayload$: Observable<CrxHMRPayload> = hmrPayload$.pipe(
  filter((p) => !isCrxHMRPayload(p)),
  window(filesReady$),
  mergeMap((p) => p.pipe(takeLast(25))),
  withLatestFrom(filesReady$),
  filter(([p, { bundle }]) => {
    if (p.type === 'full-reload') {
      // only do full reload for files in output
      return !!p.path && !!bundle[p.path]
    } else {
      // pass everything else through
      return true
    }
  }),
  map(
    ([p]): CrxHMRPayload => ({
      type: 'custom',
      event: `crx:${p.type}`,
      data: p,
    }),
  ),
)

export const pluginHMR: CrxPluginFn = () => {
  let files: ManifestFiles

  return [
    {
      name: 'crx:hmr',
      apply: 'build',
      enforce: 'pre',
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
      configureServer(server) {
        const { send } = server.ws
        server.ws.send = (payload) => {
          hmrPayload$.next(payload) // sniff hmr events
          send(payload) // don't interfere with normal hmr
        }
        crxHmrPayload$.subscribe((payload) => {
          send(payload) // send crx hmr events
        })
      },
      handleHotUpdate({ file, modules, server }) {
        const [background] = files.background
        // only update that needs special handling
        if (file === 'background' || modules.some(isImporter(background))) {
          const event: CrxHMRPayload = {
            type: 'custom',
            event: 'crx:full-reload',
            data: {
              type: 'full-reload',
              path: file,
            },
          }
          server.ws.send(event)
          return []
        }
      },
    },
  ]
}
