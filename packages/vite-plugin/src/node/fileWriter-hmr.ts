import {
  buffer,
  filter,
  firstValueFrom,
  map,
  mergeMap,
  Observable,
  Subject,
} from 'rxjs'
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

function withTimestamp(id: string, timestamp: number) {
  if (id.includes('?t=') || id.includes('&t=')) return id

  const t = `t=${timestamp}` + (id.includes('?') ? '&' : '')
  const parts = id.split('?')
  parts[1] = typeof parts[1] === 'undefined' ? t : t + parts[1]
  return parts.join('?')
}

export function getUpdatePayloadFileIds(
  p: UpdatePayload,
  { timestamp = false }: { timestamp?: boolean } = {},
) {
  const ids = new Set<string>()

  for (const u of p.updates) {
    for (const id of [u.path, u.acceptedPath]) {
      const isVirtualModule = id.startsWith('/@id/') || id.startsWith('/__')
      const isQueryModule = id.includes('?')
      if (isVirtualModule || isQueryModule)
        ids.add(timestamp ? withTimestamp(id, u.timestamp) : id)
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
      debug('update payload with %d updates', p.updates.length)
      for (const u of p.updates) {
        debug(
          'update item: path=%s acceptedPath=%s type=%s',
          u.path,
          u.acceptedPath,
          u.type,
        )
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

export async function prepareVitePayloadForCrx(
  p: HMRPayload,
): Promise<HMRPayload> {
  if (p.type === 'update') {
    // Update files on disk for payload-only module ids. Regular files are
    // handled by handleHotUpdate; query modules like Vue SFC styles are not.
    const pendingFiles = getUpdatePayloadFileIds(p, {
      timestamp: true,
    }).flatMap((id) => {
      debug('updating payload module: %s', id)
      return update(id).map((file) => file.file)
    })
    await Promise.all(pendingFiles)
    await firstValueFrom(allFilesReady$)
  }

  return mapVitePayloadForCrx(p)
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
  mergeMap(prepareVitePayloadForCrx),
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
