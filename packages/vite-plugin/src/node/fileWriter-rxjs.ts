import {
  filter,
  map,
  mergeMap,
  Observable,
  of,
  ReplaySubject,
  retry,
  switchMap,
  throwError,
} from 'rxjs'
import { ViteDevServer } from 'vite'
import { getFileName, getOutputPath, getViteUrl } from './fileWriter-utilities'
import { CrxDevAssetId, CrxDevScriptId, CrxPlugin } from './types'

/* ----------------- SERVER EVENTS ----------------- */

export interface ServerEventStart {
  type: 'start'
  server: ViteDevServer
}
export interface ServerEventClose {
  type: 'close'
}

/** Using a replay subject so we can get the last of either event */
export const serverEvent$ = new ReplaySubject<
  ServerEventStart | ServerEventClose
>(1)
export const close$ = serverEvent$.pipe(
  filter((e): e is ServerEventClose => e.type === 'close'),
  switchMap(() => throwError(() => new Error('Server has closed'))),
)
export const start$ = serverEvent$.pipe(
  filter((e): e is ServerEventStart => e.type === 'start'),
  switchMap((e) => of(e)),
)

/* ------------------- WRITE OPS ------------------- */

interface OperatorFileData {
  ($: Observable<ServerEventStart>): Observable<{
    target: string
    source: string | Uint8Array
    deps: string[]
  }>
}

export function prepFileData(
  fileId: CrxDevAssetId | CrxDevScriptId,
): OperatorFileData {
  const fileName = getFileName(fileId)
  if (fileId.type === 'asset') {
    return prepAsset(fileName, fileId)
  } else {
    return prepScript(fileName, fileId)
  }
}

function prepAsset(
  fileName: string,
  { source }: CrxDevAssetId,
): OperatorFileData {
  return ($) =>
    $.pipe(
      map(({ server }) => {
        const target = getOutputPath(server, fileName)
        return { target, source, deps: [] }
      }),
    )
}

function prepScript(
  fileName: string,
  script: CrxDevScriptId,
): OperatorFileData {
  return ($) =>
    $.pipe(
      // get script contents from dev server
      mergeMap(async ({ server }) => {
        const target = getOutputPath(server, fileName)
        const viteUrl = getViteUrl(script)
        const transformResult = await server.transformRequest(viteUrl)
        if (!transformResult)
          throw new TypeError(`Unable to load "${script.id}" from server.`)

        const { code, deps = [], dynamicDeps = [] } = transformResult
        return { target, code, deps: [deps, dynamicDeps].flat(), server }
      }),
      // retry in case of dependency rebundle
      retry({ count: 10, delay: 100 }),
      // patch content scripts
      mergeMap(async ({ target, server, ...rest }) => {
        const plugins = server.config.plugins as CrxPlugin[]
        let { code, deps } = rest
        for (const plugin of plugins) {
          const r = await plugin.renderCrxDevScript?.(code, script)
          if (typeof r === 'string') {
            code = r
          } else if (r) {
            code = r.code
            deps = [deps, r.deps].flat()
          }
        }
        return { target, source: code, deps: [...new Set(deps)] }
      }),
    )
}
