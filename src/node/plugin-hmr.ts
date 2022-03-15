import {
  buffer,
  filter,
  map,
  mergeMap,
  Observable,
  Subject,
  tap,
  withLatestFrom,
} from 'rxjs'
import {
  FullReloadPayload,
  HMRPayload,
  ModuleNode,
  Update,
  ViteDevServer,
} from 'vite'
import { outputByOwner } from './fileMeta'
import { manifestFiles, _debug } from './helpers'
import { join } from './path'
import { filesReady$ } from './plugin-fileWriter--events'
import type { CrxHMRPayload, CrxPluginFn, ManifestFiles } from './types'

const debug = _debug('hmr')

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

const crxRuntimeReload: CrxHMRPayload = {
  type: 'custom',
  event: 'crx:runtime-reload',
}

const hmrPayload$ = new Subject<HMRPayload>()
/**
 * Buffer hmrPayloads by filesReady
 *
 * What about assets and manifest?
 */
const crxHmrPayload$: Observable<CrxHMRPayload> = hmrPayload$.pipe(
  filter((p) => !isCrxHMRPayload(p)),
  buffer(filesReady$),
  mergeMap((pps) => {
    let fullReload: FullReloadPayload | undefined
    const payloads: HMRPayload[] = []
    for (const p of pps.slice(-50)) // payloads could accumulate during HTML development
      if (p.type === 'full-reload') {
        fullReload = p // only one full reload per build
      } else {
        payloads.push(p)
      }
    if (fullReload) payloads.push(fullReload)
    return payloads
  }),
  map((p): HMRPayload => {
    switch (p.type) {
      case 'full-reload': {
        const path = p.path && outputByOwner.get(p.path)
        const fullReload: FullReloadPayload = {
          type: 'full-reload',
          path,
        }
        return fullReload
      }

      case 'prune': {
        const paths: string[] = []
        for (const owner of p.paths)
          if (outputByOwner.has(owner)) paths.push(outputByOwner.get(owner)!)
        return { type: 'prune', paths }
      }

      case 'update': {
        const updates: Update[] = []
        for (const { acceptedPath, path, ...rest } of p.updates)
          if (outputByOwner.has(acceptedPath) && outputByOwner.has(path))
            updates.push({
              ...rest,
              acceptedPath: outputByOwner.get(acceptedPath)!,
              path: outputByOwner.get(path)!,
            })
        return { type: 'update', updates }
      }

      default:
        return p // connected, custom, error
    }
  }),
  withLatestFrom(filesReady$),
  filter(([p, { bundle }]) => {
    switch (p.type) {
      case 'full-reload':
        return typeof p.path === 'undefined' || p.path in bundle
      case 'prune':
        return p.paths.length > 0
      case 'update':
        return p.updates.length > 0
      default:
        return true
    }
  }),
  tap(([p]) => {
    p
  }),
  map(
    ([p]): CrxHMRPayload => ({
      type: 'custom',
      event: 'crx:content-script-payload',
      data: p,
    }),
  ),
)

export const pluginHMR: CrxPluginFn = () => {
  let files: ManifestFiles
  let server: ViteDevServer

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
        watch.ignored.push(config.build.outDir)
      },
      configureServer(_server) {
        server = _server
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
        const background =
          files.background[0] && join(server.config.root, files.background[0])

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
