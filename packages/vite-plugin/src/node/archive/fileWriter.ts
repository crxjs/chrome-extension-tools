import fsx from 'fs-extra'
import {
  NormalizedInputOptions,
  NormalizedOutputOptions,
  OutputBundle,
  rollup,
} from 'rollup'
import {
  BehaviorSubject,
  EMPTY,
  first,
  firstValueFrom,
  mergeMap,
  of,
  ReplaySubject,
  retry,
  switchMap,
} from 'rxjs'
import { TransformResult, ViteDevServer } from 'vite'
import { _debug } from '../helpers'
import { isAbsolute, join } from '../path'
import { CrxPlugin } from '../types'
import { stubId } from '../virtualFileIds'

const debug = _debug('file-writer')

const { outputFile } = fsx

export type ScriptType = 'loader' | 'module' | 'iife'
export interface ScriptModule {
  type: ScriptType
  file?: Promise<{ modules: ScriptModule[]; target: string }>
  fileName: string
  viteUrl: string
}

const scriptModulesChange$ = new BehaviorSubject<void>(undefined)
type MapProp = keyof Map<string, ScriptModule>
const mapProps: MapProp[] = ['clear', 'set', 'delete']
// spy on changes to script module
export const scriptModules = new Proxy(new Map<string, ScriptModule>(), {
  get(target, prop: MapProp) {
    const method = Reflect.get(target, prop)
    // @ts-expect-error too dynamic for typescript
    if (!mapProps.includes(prop)) return method?.bind(target)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return function (this: typeof target, ...args: any[]) {
      scriptModulesChange$.next(undefined)
      // @ts-expect-error too dynamic for typescript
      return method.call(this, ...args)
    }.bind(target)
  },
})

export const buildEvent$ = new ReplaySubject<
  | {
      type: 'buildStart'
      options: NormalizedInputOptions
    }
  | {
      type: 'writeBundle'
      options: NormalizedOutputOptions
      bundle: OutputBundle
    }
>()
export const filesReady$ = buildEvent$.pipe(
  first(({ type }) => type === 'writeBundle'),
  switchMap(() => scriptModulesChange$),
  mergeMap(() =>
    Promise.all([...scriptModules.values()].map(({ file }) => file)),
  ),
)
export const serverEvent$ = new ReplaySubject<
  | {
      type: 'start'
      server: ViteDevServer
    }
  | { type: 'close' }
>(1)

buildEvent$.subscribe(({ type }) => debug(type))
serverEvent$.subscribe(() => debug('server'))
filesReady$.subscribe(() => debug('filesReady'))

export async function filesReady(): Promise<typeof scriptModules> {
  await firstValueFrom(filesReady$)
  return scriptModules
}

/** Resolves when initial file write is complete. */
export async function start({
  server,
  plugins,
}: {
  server: ViteDevServer
  plugins: CrxPlugin[]
}) {
  serverEvent$.next({ type: 'start', server })
  try {
    for (const script of scriptModules.values()) {
      scriptModules.set(script.viteUrl, {
        ...script,
        file: write(script),
      })
    }

    const build = await rollup({
      input: stubId,
      plugins: [
        {
          name: 'crx:file-writer-rollup-events',
          buildStart(options) {
            buildEvent$.next({ type: 'buildStart', options })
          },
        },
        ...plugins,
        {
          name: 'crx:file-writer-rollup-events',
          writeBundle(options, bundle) {
            buildEvent$.next({ type: 'writeBundle', options, bundle })
          },
        },
      ],
    })

    await build.write({
      dir: server.config.build.outDir,
      format: 'es',
      ...server.config.build.rollupOptions.output,
      assetFileNames: 'assets/[name].[ext].js',
    })
  } catch (error) {
    console.error(error)
  }
}

/** Signals file writer to abandon active write operations. */
export function close() {
  serverEvent$.next({ type: 'close' })
}

/**
 * Call `add` if you don't want to update existing files. ScriptModule.file
 * resolves when the file and all dependencies are ready.
 */
export function add({
  type,
  viteUrl,
}: {
  type: ScriptType
  viteUrl: string
}): ScriptModule {
  const fileName = toFileName({ viteUrl, type })
  const script = scriptModules.get(fileName) ?? {
    viteUrl,
    type,
    file: write({ viteUrl, type }),
    fileName,
  }
  scriptModules.set(viteUrl, script)
  debug('add %o', script)
  return script
}

/**
 * It's possible for multiple script types to have the same URL, this function
 * updates all types.
 */
export function update(viteUrl: string): ScriptModule[] {
  const types: ScriptType[] = ['iife', 'loader', 'module']
  const result: ScriptModule[] = []
  for (const type of types) {
    const fileName = toFileName({ type, viteUrl })
    const script = scriptModules.get(fileName)
    if (script) {
      script.file = write({ viteUrl, type })
      result.push(script)
      scriptModules.set(fileName, script)
    }
  }

  return result
}

/** Call `write` to force a file write. Waits until the server is ready & writes the file. */
export async function write({
  type,
  viteUrl,
}: {
  type: ScriptType
  viteUrl: string
}): Promise<{ modules: ScriptModule[]; target: string }> {
  const fileName = toFileName({ type, viteUrl })
  // using an observable so that update is cancellable
  // when update is cancelled this promise will never resolve
  // depending on when the switch happens, it may abort the file write
  const results = await firstValueFrom(
    serverEvent$.pipe(
      // cancel previous update when file writer is closed
      // subsequent mappings points to possibly cut work short
      switchMap((event) => (event.type === 'start' ? of(event.server) : EMPTY)),
      // load the module
      mergeMap(async (server) => {
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
        const target = isAbsolute(outDir)
          ? join(outDir, fileName)
          : join(root, outDir, fileName)

        return { target, code, deps: [deps, dynamicDeps].flat() }
      }),
      // retry in case of dependency rebundle
      retry({ count: 10, delay: 100 }),
      // concurrently output file and add dependencies
      mergeMap(async ({ target, code, deps }) => {
        const output = outputFile(target, code, { encoding: 'utf8' })
        const added = deps.map((viteUrl: string) => add({ viteUrl, type }))
        const [, ...modules] = await Promise.all([output, ...added])
        return { modules, target }
      }),
    ),
  )
  debug('update %o', { type, viteUrl })
  return results
}

/** Deterministic conversion of Vite URL to output filename. */
export function toFileName({
  viteUrl,
}: {
  type: ScriptType
  viteUrl: string
}): string {
  let replaced = viteUrl.replace(/\?/g, '__')
  replaced = replaced.replace(/&/g, '--')
  return `${replaced}.js`
}
