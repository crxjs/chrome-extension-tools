import MagicString from 'magic-string'
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
import {
  FullReloadPayload,
  HMRPayload,
  ModuleNode,
  Update,
  ViteDevServer,
} from 'vite'
import { ownerById, pathById, pathByOwner, urlById } from './fileMeta'
import { manifestFiles } from './helpers'
import { filesReady$ } from './plugin-fileWriter--events'
import type { CrxHMRPayload, CrxPluginFn, ManifestFiles } from './types'
import { viteClientUrl } from './virtualFileIds'

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
  window(filesReady$),
  mergeMap((p) => p.pipe(takeLast(25))),
  map((p): HMRPayload => {
    switch (p.type) {
      case 'full-reload': {
        const path = p.path && pathByOwner.get(p.path)
        const fullReload: FullReloadPayload = {
          type: 'full-reload',
          path,
        }
        return fullReload
      }
      case 'prune': {
        const paths: string[] = []
        for (const owner of p.paths)
          if (pathByOwner.has(owner)) paths.push(pathByOwner.get(owner)!)
        return { type: 'prune', paths }
      }
      case 'update': {
        const updates: Update[] = []
        for (const { acceptedPath, path, ...rest } of p.updates)
          if (pathByOwner.has(acceptedPath) && pathByOwner.has(path))
            updates.push({
              ...rest,
              acceptedPath: pathByOwner.get(acceptedPath)!,
              path: pathByOwner.get(path)!,
            })
        return { type: 'update', updates }
      }
      default:
        return p
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
  map(([p]): CrxHMRPayload => {
    if (p.type === 'full-reload') return crxRuntimeReload

    return {
      type: 'custom',
      event: 'crx:content-script-payload',
      data: p,
    }
  }),
)
export const pluginHMR: CrxPluginFn = () => {
  let files: ManifestFiles
  let server: ViteDevServer

  return [
    {
      name: 'crx:hmr',
      apply: 'build',
      enforce: 'pre',
      async renderChunk(code, chunk) {
        if (this.meta.watchMode) {
          const [id, ...rest] = Object.keys(chunk.modules)
          if (rest.length) return null

          const url = urlById.get(id)!
          if (url === viteClientUrl) return null

          const pathName = pathById.get(id)
          if (!pathName) return null

          const ownerPath = ownerById.get(id)
          if (!ownerPath) return null

          const index = code.indexOf('createHotContext(')
          if (index === -1) return null

          const start = code.indexOf(ownerPath, index)
          const end = start + ownerPath.length
          if (start > 0) {
            const magic = new MagicString(code)
            magic.overwrite(start, end, pathName)
            return { code: magic.toString(), map: magic.generateMap() }
          }
        }

        return null
      },
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
        const [background] = files.background
        // only update that needs special handling
        if (file === 'background' || modules.some(isImporter(background))) {
          server.ws.send(crxRuntimeReload)
          return []
        }
      },
    },
  ]
}
