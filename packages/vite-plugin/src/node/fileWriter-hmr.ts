import { buffer, filter, map, mergeMap, Observable, Subject } from 'rxjs'
import {
  CustomPayload,
  FullReloadPayload,
  HMRPayload,
  PrunePayload,
  Update,
  UpdatePayload,
} from 'vite'
import { allFilesReady$ } from './fileWriter-rxjs'
import { getFileName, getViteUrl, prefix } from './fileWriter-utilities'
import { _debug } from './helpers'
import { CrxHMRPayload } from './types'

const debug = _debug('file-writer').extend('hmr')

/* ------------------- HMR EVENTS ------------------ */

const isCustomPayload = (p: HMRPayload): p is CustomPayload => {
  return p.type === 'custom'
}

const isFrameworkHMREvent = (p: HMRPayload): boolean => {
  if (!isCustomPayload(p)) return false
  // Allow Vue HMR events (vue:rerender, vue:reload, etc.)
  // Allow Svelte HMR events (svelte:component-reload, etc.)
  // Allow file-changed event (used by Vue to track which file changed for rerender-only updates)
  return (
    p.event.startsWith('vue:') ||
    p.event.startsWith('svelte:') ||
    p.event === 'file-changed'
  )
}

export const hmrPayload$ = new Subject<HMRPayload>()
export const crxHMRPayload$: Observable<CrxHMRPayload> = hmrPayload$.pipe(
  filter((p) => !isCustomPayload(p) || isFrameworkHMREvent(p)),
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
          paths: p.paths.map((id: string) =>
            getViteUrl({ id, type: 'module' }),
          ),
        }
        return prune
      }

      case 'update': {
        const update: UpdatePayload = {
          type: 'update',
          updates: p.updates.map(
            ({ acceptedPath: ap, path: p, ...rest }: Update) => ({
              ...rest,
              acceptedPath: prefix(
                '/',
                getFileName({ id: ap, type: 'module' }),
              ),
              path: prefix('/', getFileName({ id: p, type: 'module' })),
            }),
          ),
        }
        return update
      }

      case 'custom': {
        // Handle framework HMR events (Vue, Svelte, etc.)
        if (isFrameworkHMREvent(p)) {
          const custom = p as CustomPayload
          // Transform paths in custom event data if present
          if (
            custom.data &&
            typeof custom.data === 'object' &&
            'path' in custom.data
          ) {
            return {
              ...custom,
              data: {
                ...custom.data,
                path: prefix(
                  '/',
                  getFileName({
                    id: custom.data.path as string,
                    type: 'module',
                  }),
                ),
              },
            }
          }
        }
        return p
      }

      default:
        return p // connected, error
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
