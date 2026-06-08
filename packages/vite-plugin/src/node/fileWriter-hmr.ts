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

export function getUpdatePayloadFileIds(p: UpdatePayload) {
  const ids = new Set<string>()

  for (const u of p.updates) {
    for (const id of [u.path, u.acceptedPath]) {
      const isVirtualModule = id.startsWith('/@id/') || id.startsWith('/__')
      const isQueryModule = id.includes('?')
      if (isVirtualModule || isQueryModule) ids.add(id)
    }
  }

  return [...ids]
}

export function mapVitePayloadForCrx(p: HMRPayload): HMRPayload {
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
      // Update files on disk for payload-only module ids. Regular files are
      // handled by handleHotUpdate; query modules like Vue SFC styles are not.
      debug('update payload with %d updates', p.updates.length)
      for (const u of p.updates) {
        debug(
          'update item: path=%s acceptedPath=%s type=%s',
          u.path,
          u.acceptedPath,
          u.type,
        )
      }
      for (const id of getUpdatePayloadFileIds(p)) {
        debug('updating payload module: %s', id)
        update(id)
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
}

export function shouldForwardCrxPayload(p: HMRPayload) {
  switch (p.type) {
    case 'prune':
      return p.paths.length > 0
    case 'update':
      return p.updates.length > 0
    default:
      return true
  }
}

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
  map(mapVitePayloadForCrx),
  filter(shouldForwardCrxPayload),
  map((data): CrxHMRPayload => {
    debug(`hmr payload`, data)
    return {
      type: 'custom',
      event: 'crx:content-script-payload',
      data,
    }
  }),
)
