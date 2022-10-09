import {
  buffer,
  debounce,
  filter,
  map,
  merge,
  mergeMap,
  Observable,
  Subject,
} from 'rxjs'
import {
  FullReloadPayload,
  HMRPayload,
  PrunePayload,
  Update,
  UpdatePayload,
} from 'vite'
import { outputByOwner, transformResultByOwner } from './fileMeta'
import { filesReady$ } from './fileWriter'
import { CrxHMRPayload } from '../types'

export function isUpdatePayload(p: HMRPayload): p is UpdatePayload {
  return p.type === 'update'
}
export function isFullReloadPayload(p: HMRPayload): p is FullReloadPayload {
  return p.type === 'full-reload'
}
export function isPrunePayload(p: HMRPayload): p is PrunePayload {
  return p.type === 'prune'
}
function isCrxHMRPayload(x: HMRPayload): x is CrxHMRPayload {
  return x.type === 'custom' && x.event.startsWith('crx:')
}

export const hmrPayload$ = new Subject<HMRPayload>()

const hmrPrune$ = hmrPayload$.pipe(filter(isPrunePayload))
const hmrFullReload$ = hmrPayload$.pipe(filter(isFullReloadPayload))
const hmrUpdate$ = hmrPayload$.pipe(filter(isUpdatePayload))
const payload$ = merge(hmrFullReload$, hmrPrune$, hmrUpdate$)

type RebuildType =
  | {
      type: 'partial'
      owners: Set<string>
    }
  | {
      type: 'full'
    }
/** Emits based on buffered HMRPayloads */
export const rebuildSignal$ = payload$.pipe(
  // emit buffer when files are ready (now or later)
  buffer(payload$.pipe(debounce(() => filesReady$))),
  // flatten payloads
  map((payloads): RebuildType => {
    if (payloads.every(isUpdatePayload)) {
      const owners = new Set<string>()
      for (const { updates } of payloads)
        for (const { path } of updates)
          if (transformResultByOwner.has(path)) owners.add(path)

      return { type: 'partial', owners }
    }

    return { type: 'full' }
  }),
  // exclude empty rebuilds
  filter((rebuild) =>
    rebuild.type === 'partial' ? rebuild.owners.size > 0 : true,
  ),
)

/**
 * Buffer hmrPayloads by filesReady
 *
 * What about assets and manifest?
 */
export const crxHmrPayload$: Observable<CrxHMRPayload> = hmrPayload$.pipe(
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
  filter((p) => {
    switch (p.type) {
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
  map(
    (data): CrxHMRPayload => ({
      type: 'custom',
      event: 'crx:content-script-payload',
      data,
    }),
  ),
)
