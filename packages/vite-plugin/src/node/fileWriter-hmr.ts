import { buffer, filter, map, mergeMap, Observable, Subject } from 'rxjs'
import {
  CustomPayload,
  FullReloadPayload,
  HMRPayload,
  PrunePayload,
  UpdatePayload,
} from 'vite'
import { update } from './fileWriter'
import { allFilesReady$ } from './fileWriter-rxjs'
import { getFileName, getViteUrl, prefix } from './fileWriter-utilities'
import { _debug } from './helpers'
import { CrxHMRPayload } from './types'

const debug = _debug('file-writer').extend('hmr')

/* ------------------- HMR EVENTS ------------------ */

const isCustomPayload = (p: HMRPayload): p is CustomPayload => {
  return p.type === 'custom'
}
export const hmrPayload$ = new Subject<HMRPayload>()
export const crxHMRPayload$: Observable<CrxHMRPayload> = hmrPayload$.pipe(
  filter((p) => !isCustomPayload(p)),
  buffer(allFilesReady$),
  mergeMap((pps) => {
    let fullReload: FullReloadPayload | undefined
    const payloads: HMRPayload[] = []
    for (const p of pps)
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
        const fullReload: FullReloadPayload = {
          type: 'full-reload',
          path: p.path && getViteUrl({ id: p.path, type: 'module' }),
        }
        return fullReload
      }

      case 'prune': {
        const prune: PrunePayload = {
          type: 'prune',
          paths: p.paths.map((id) => getViteUrl({ id, type: 'module' })),
        }
        return prune
      }

      case 'update': {
        // Update files on disk for virtual modules and other HMR updates
        // This ensures the extension can fetch the updated content
        debug('update payload with %d updates', p.updates.length)
        for (const u of p.updates) {
          debug(
            'update item: path=%s acceptedPath=%s type=%s',
            u.path,
            u.acceptedPath,
            u.type,
          )
          // Update virtual modules - regular files are handled by handleHotUpdate
          // Virtual modules can have different formats:
          // - /@id/__x00__virtual:uno.css (Vite's standard virtual module format)
          // - /__uno.css (UnoCSS's virtual module format)
          const isVirtualModule =
            u.path.startsWith('/@id/') || u.path.startsWith('/__')
          if (isVirtualModule) {
            debug('updating virtual module: %s', u.path)
            update(u.path)
          }
        }
        const update_: UpdatePayload = {
          type: 'update',
          updates: p.updates.map(({ acceptedPath: ap, path: p, ...rest }) => ({
            ...rest,
            acceptedPath: prefix('/', getFileName({ id: ap, type: 'module' })),
            path: prefix('/', getFileName({ id: p, type: 'module' })),
          })),
        }
        return update_
      }

      default:
        return p // connected, custom, error
    }
  }),
  filter((p) => {
    switch (p.type) {
      // TODO: why not reload when path is defined?
      case 'full-reload':
        return typeof p.path === 'undefined'
      case 'prune':
        return p.paths.length > 0
      case 'update':
        return p.updates.length > 0
      default:
        return true
    }
  }),
  map((data): CrxHMRPayload => {
    debug(`hmr payload`, data)
    return {
      type: 'custom',
      event: 'crx:content-script-payload',
      data,
    }
  }),
)
