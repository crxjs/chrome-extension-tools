import { buffer, filter, map, mergeMap, Observable, Subject } from 'rxjs'
import {
  FullReloadPayload,
  HMRPayload,
  PrunePayload,
  UpdatePayload,
} from 'vite'
import { allFilesReady$ } from './fileWriter-rxjs'
import { getFileName, getViteUrl, prefix } from './fileWriter-utilities'
import { _debug } from './helpers'
import { CrxHMRPayload } from './types'

const debug = _debug('file-writer').extend('hmr')

/* ------------------- HMR EVENTS ------------------ */

const isCrxHMRPayload = (p: HMRPayload): p is CrxHMRPayload =>
  p.type === 'custom' && p.event.startsWith('crx:')
export const hmrPayload$ = new Subject<HMRPayload>()
export const crxHMRPayload$: Observable<CrxHMRPayload> = hmrPayload$.pipe(
  filter((p) => !isCrxHMRPayload(p)),
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
        const update: UpdatePayload = {
          type: 'update',
          updates: p.updates.map(({ acceptedPath: ap, path: p, ...rest }) => ({
            ...rest,
            acceptedPath: prefix('/', getFileName({ id: ap, type: 'module' })),
            path: prefix('/', getFileName({ id: p, type: 'module' })),
          })),
        }
        return update
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
    return {
      type: 'custom',
      event: 'crx:content-script-payload',
      data,
    }
  }),
)
