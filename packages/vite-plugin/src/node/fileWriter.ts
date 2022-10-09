import fsExtra from 'fs-extra'
import { rollup } from 'rollup'
import {
  BehaviorSubject,
  EMPTY,
  first,
  firstValueFrom,
  map,
  mergeMap,
  of,
  ReplaySubject,
  retry,
  switchMap,
} from 'rxjs'
import { TransformResult, ViteDevServer } from 'vite'
import { join } from './path'
import { CrxPlugin } from './types'
import { stubId } from './virtualFileIds'

const { outputFile, stat } = fsExtra
type FSStats = fsExtra.Stats

export type ScriptType = 'loader' | 'module' | 'iife'
export interface ScriptModule {
  type: ScriptType
  viteUrl: string
  stats?: Promise<FSStats>
}

type MapProp = keyof typeof _scriptModules
const mapProps: MapProp[] = ['clear', 'set', 'delete']
const scriptModulesChange$ = new BehaviorSubject<void>(undefined)
const _scriptModules = new Map<string, ScriptModule>()
export const scriptModules = new Proxy(_scriptModules, {
  get(target, prop: MapProp) {
    const method = Reflect.get(target, prop)
    if (typeof method !== 'function') return method
    if (mapProps.includes(prop)) scriptModulesChange$.next()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return function (this: typeof target, ...args: any[]) {
      return method.call(this, ...args)
    }.bind(target)
  },
})

const build$ = new ReplaySubject<
  { type: 'buildStart' } | { type: 'writeBundle' }
>()
const server$ = new ReplaySubject<ViteDevServer | undefined>(1)
/** Stats resolve after file write is complete. */
export async function filesReady(): Promise<typeof scriptModules> {
  return firstValueFrom(
    build$.pipe(
      first(({ type }) => type === 'writeBundle'),
      switchMap(() => scriptModulesChange$),
      switchMap(async () => {
        await Promise.all(
          [...scriptModules.values()].map(({ stats }) => {
            return stats
          }),
        )
      }),
      map(() => scriptModules),
    ),
  )
}

export async function start({
  server,
  plugins,
}: {
  server: ViteDevServer
  plugins: CrxPlugin[]
}) {
  server$.next(server)
  for (const script of scriptModules.values()) {
    scriptModules.set(script.viteUrl, {
      ...script,
      stats: update(script),
    })
  }

  try {
    const build = await rollup({
      input: stubId,
      context: 'this',
      plugins: [
        ...plugins,
        {
          name: 'crx:file-writer-rollup-events',
          buildStart() {
            build$.next({ type: 'buildStart' })
          },
          writeBundle() {
            build$.next({ type: 'writeBundle' })
          },
        },
      ],
    })

    await build.write({
      dir: server.config.build.outDir,
      format: 'es',
      ...server.config.build.rollupOptions.output,
    })
  } catch (error) {
    console.error(error)
  }
}
export function close() {
  server$.next(undefined)
  for (const script of scriptModules.values()) {
    delete script.stats
  }
}

/** `add` updates a new file. Call `add` if you don't want to update existing files. */
export async function add({
  viteUrl,
  type,
}: {
  viteUrl: string
  type: ScriptType
}): Promise<ScriptModule> {
  const script = scriptModules.get(viteUrl) ?? {
    viteUrl,
    type,
    stats: update({ viteUrl, type }),
  }
  scriptModules.set(viteUrl, script)
  await script.stats
  return script
}

/**
 * `update` waits until the server is ready & writes the file. Call update to
 * force a file write.
 */
export async function update({
  viteUrl,
  type,
}: {
  viteUrl: string
  type: ScriptType
}): Promise<FSStats> {
  const fileName = toFileName(viteUrl)
  // using an observable so that update is cancellable
  // when update is cancelled this promise will never resolve
  // depending on when the switch happens, it may abort the file write
  return firstValueFrom(
    server$.pipe(
      // cancel previous update when file writer is closed
      // subsequent mappings points to possibly cut work short
      switchMap((server) => (server ? of(server) : EMPTY)),
      // load the module
      mergeMap(async (server) => {
        // TODO: handle module types
        // TODO: polyfill @vite/client
        let serverModule = await server.moduleGraph.getModuleByUrl(viteUrl)
        let transformResult: TransformResult | null = null
        if (!serverModule) {
          // first time, always transform
          transformResult = await server.transformRequest(viteUrl)
          serverModule = await server.moduleGraph.getModuleByUrl(viteUrl)
        }
        if (!serverModule)
          throw new Error(`Unable to load "${viteUrl}" from server.`)

        if (!transformResult)
          transformResult = await server.transformRequest(viteUrl)
        if (!transformResult)
          throw new TypeError(`Unable to load "${viteUrl}" from server.`)

        const { code, deps = [], dynamicDeps = [] } = transformResult
        const {
          root,
          build: { outDir },
        } = server.config
        const target = join(root, outDir, fileName)

        return { target, code, deps: [deps, dynamicDeps].flat() }
      }),
      // retry in case of dependency rebundle
      retry({ count: 10, delay: 100 }),
      // concurrently output file and add dependencies
      mergeMap(async ({ target, code, deps }): Promise<FSStats> => {
        const output = outputFile(target, code, { encoding: 'utf8' })
        const added = deps.map((viteUrl: string) => add({ viteUrl, type }))
        await Promise.all([output, ...added])
        return stat(target)
      }),
    ),
  )
}

/** Convert Vite URL to output filename */
export function toFileName(viteUrl: string): string {
  let replaced = viteUrl.replace(/\?/g, '__')
  replaced = replaced.replace(/&/g, '--')
  return `${replaced}.js`
}
