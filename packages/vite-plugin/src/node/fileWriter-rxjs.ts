import * as lexer from 'es-module-lexer'
import { readFile } from 'fs-extra'
import MagicString from 'magic-string'
import {
  filter,
  mergeMap,
  Observable,
  of,
  ReplaySubject,
  retry,
  switchMap,
} from 'rxjs'
import { ViteDevServer } from 'vite'
import { getFileName, getOutputPath, getViteUrl } from './fileWriter-utilities'
import { join } from './path'
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
  switchMap((e) => of(e)),
)
export const start$ = serverEvent$.pipe(
  filter((e): e is ServerEventStart => e.type === 'start'),
  switchMap((e) => of(e)),
)

/* ------------------ BUILD EVENTS ----------------- */

export interface FileWriterEventBuildStart {
  type: 'build_start'
}
export interface FileWriterEventBuildEnd {
  type: 'build_end'
}

/** Using a replay subject so we can get the last of either event */
export const fileWriterEvent$ = new ReplaySubject<
  FileWriterEventBuildStart | FileWriterEventBuildEnd
>(1)
export const buildEnd$ = fileWriterEvent$.pipe(
  filter((e): e is FileWriterEventBuildEnd => e.type === 'build_end'),
  switchMap((e) => of(e)),
)
export const buildStart$ = fileWriterEvent$.pipe(
  filter((e): e is FileWriterEventBuildStart => e.type === 'build_start'),
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
  { id, source }: CrxDevAssetId,
): OperatorFileData {
  return ($) =>
    $.pipe(
      mergeMap(async ({ server }) => {
        const target = getOutputPath(server, fileName)
        return {
          target,
          source: source ?? (await readFile(join(server.config.root, id))),
          deps: [],
        }
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
        return { target, code, deps: [...deps, ...dynamicDeps].flat(), server }
      }),
      // retry in case of dependency rebundle
      retry({ count: 10, delay: 100 }),
      // patch content scripts
      mergeMap(async ({ target, server, ...rest }) => {
        const plugins = server.config.plugins as CrxPlugin[]
        let { code, deps } = rest
        for (const plugin of plugins) {
          const r = await plugin.renderCrxDevScript?.(code, script)
          if (typeof r === 'string') code = r
        }
        return { target, code, deps }
      }),
      mergeMap(async ({ target, code, deps }) => {
        await lexer.init
        const [imports] = lexer.parse(code, fileName)
        const depSet = new Set(deps)
        const magic = new MagicString(code)
        for (const i of imports)
          if (i.n) {
            depSet.add(i.n)
            const fileName = getFileName({ type: 'module', id: i.n })
            magic.overwrite(i.s, i.e, `/${fileName}`)
          }
        return { target, source: magic.toString(), deps: [...depSet] }
      }),
    )
}
