import { parse as parseAst } from 'acorn'
import { createHash } from 'crypto'
import fsx from 'fs-extra'
import type { ResolvedConfig, ViteDevServer } from 'vite'
import { basename, extname, isAbsolute, join } from './path'
import type {
  CrxEmittedFile,
  CrxOutputBundle,
  CrxPlugin,
  CrxPluginContext,
} from './types'

const { outputFile } = fsx

type HookHandler<T> = T | { handler: T }
type DevInputOptions = Record<string, unknown>
type DevOutputOptions = {
  dir: string
  format: 'es'
  assetFileNames?: string | ((assetInfo: unknown) => string)
  entryFileNames?: string | ((chunkInfo: unknown) => string)
  chunkFileNames?: string | ((chunkInfo: unknown) => string)
}

type TransformResult = string | { code: string; map?: unknown } | null | void
type LoadResult =
  | string
  | Uint8Array
  | { code: string; map?: unknown }
  | null
  | void

interface EmittedFileData {
  file: CrxEmittedFile
  fileName: string
  source?: string | Uint8Array
  processed?: boolean
}

function getHook<T>(hook: HookHandler<T> | undefined): T | undefined {
  if (!hook) return undefined
  if (typeof hook === 'object' && 'handler' in hook) return hook.handler
  return hook
}

function firstOutputOptions(config: ResolvedConfig): DevOutputOptions {
  const { rollupOptions, outDir } = config.build
  const rollupOutputOptions = [rollupOptions.output].flat()[0] ?? {}
  return {
    ...rollupOutputOptions,
    dir: isAbsolute(outDir) ? outDir : join(config.root, outDir),
    format: 'es',
  } as DevOutputOptions
}

function hash(source: string | Uint8Array | undefined): string {
  return createHash('sha256')
    .update(source ?? '')
    .digest('hex')
    .slice(0, 8)
}

function renderPattern(
  pattern: string,
  {
    name,
    source,
  }: {
    name: string
    source?: string | Uint8Array
  },
) {
  const extName = extname(name)
  const baseName = basename(name, extName)
  const ext = extName.startsWith('.') ? extName.slice(1) : extName
  const digest = hash(source)

  return pattern
    .replace(/\[name\]/g, baseName)
    .replace(/\[extname\]/g, extName)
    .replace(/\[ext\]/g, ext)
    .replace(/\[hash(?::(\d+))?\]/g, (_match, length?: string) =>
      length ? digest.slice(0, Number(length)) : digest,
    )
}

function normalizeLoadResult(result: LoadResult): {
  code: string
  map?: unknown
} | null {
  if (typeof result === 'string') return { code: result }
  if (result instanceof Uint8Array)
    return { code: Buffer.from(result).toString('utf8') }
  if (result && typeof result === 'object' && typeof result.code === 'string')
    return { code: result.code, map: result.map }
  return null
}

function normalizeTransformResult(
  result: TransformResult,
): { code: string; map?: unknown } | null {
  if (typeof result === 'string') return { code: result }
  if (result && typeof result === 'object' && typeof result.code === 'string')
    return { code: result.code, map: result.map }
  return null
}

class DevBundleRunner {
  readonly bundle: CrxOutputBundle = {}
  readonly context: CrxPluginContext

  private readonly emitted = new Map<string, EmittedFileData>()
  private refIndex = 0

  constructor(
    private readonly server: ViteDevServer,
    private readonly outputOptions: DevOutputOptions,
  ) {
    this.context = {
      emitFile: (file) => this.emitFile(file),
      getFileName: (refId) => this.getFileName(refId),
      setAssetSource: (refId, source) => this.setAssetSource(refId, source),
      parse: (code) =>
        parseAst(code, {
          ecmaVersion: 'latest',
          sourceType: 'module',
        }),
      addWatchFile: () => undefined,
      warn: (warning) => console.warn(warning),
      error: (error) => {
        if (error instanceof Error) throw error
        throw new Error(String(error))
      },
      resolve: async (source, importer, options) => {
        const resolved = await this.server.pluginContainer.resolveId(
          source,
          importer,
          options as Parameters<
            ViteDevServer['pluginContainer']['resolveId']
          >[2],
        )
        return resolved ? { id: resolved.id } : null
      },
    }
  }

  async run(plugins: CrxPlugin[]) {
    let inputOptions: DevInputOptions = {
      input: 'index.html',
      ...this.server.config.build.rollupOptions,
      plugins,
    }

    for (const plugin of plugins) {
      const options = getHook(plugin.options)
      if (!options) continue
      const runOptions = options as unknown as (
        this: CrxPluginContext,
        options: DevInputOptions,
      ) => DevInputOptions | null | void | Promise<DevInputOptions | null | void>
      const result = await runOptions.call(this.context, inputOptions)
      if (result) inputOptions = { ...inputOptions, ...result }
    }

    for (const plugin of plugins) {
      const buildStart = getHook(plugin.buildStart)
      if (buildStart) {
        const runBuildStart = buildStart as unknown as (
          this: CrxPluginContext,
          options: DevInputOptions,
        ) => void | Promise<void>
        await runBuildStart.call(this.context, inputOptions)
      }
    }

    await this.processEmittedChunks(plugins)

    for (const plugin of plugins) {
      const generateBundle = getHook(plugin.generateBundle)
      if (generateBundle) {
        const runGenerateBundle = generateBundle as unknown as (
          this: CrxPluginContext,
          options: DevOutputOptions,
          bundle: CrxOutputBundle,
          isWrite: boolean,
        ) => void | Promise<void>
        await runGenerateBundle.call(
          this.context,
          this.outputOptions,
          this.bundle,
          true,
        )
      }
    }

    await this.writeBundle()
  }

  private emitFile(file: CrxEmittedFile): string {
    const refId = `crx:${file.type}:${this.refIndex++}`
    const fileName = this.resolveFileName(file)
    const data: EmittedFileData = { file, fileName }
    this.emitted.set(refId, data)

    if (file.type === 'asset' && typeof file.source !== 'undefined') {
      data.source = file.source
      this.bundle[fileName] = {
        type: 'asset',
        fileName,
        name: file.name,
        source: file.source,
      }
    }

    return refId
  }

  private getFileName(refId: string): string {
    const data = this.emitted.get(refId)
    if (!data) throw new Error(`Unable to get file name for "${refId}"`)
    return data.fileName
  }

  private setAssetSource(refId: string, source: string | Uint8Array): void {
    const data = this.emitted.get(refId)
    if (!data) throw new Error(`Unable to set asset source for "${refId}"`)
    if (data.file.type !== 'asset')
      throw new Error(`Cannot set asset source for chunk "${refId}"`)

    data.source = source
    this.bundle[data.fileName] = {
      type: 'asset',
      fileName: data.fileName,
      name: data.file.name,
      source,
    }
  }

  private resolveFileName(file: CrxEmittedFile): string {
    if (file.fileName) return file.fileName

    if (file.type === 'asset') {
      const name = file.name ?? 'asset'
      const assetFileNames = this.outputOptions.assetFileNames
      if (typeof assetFileNames === 'function') {
        return assetFileNames({
          name,
          source: file.source,
          type: 'asset',
        })
      }

      return renderPattern(assetFileNames ?? 'assets/[name]-[hash][extname]', {
        name,
        source: file.source,
      })
    }

    const name = file.name ?? basename(file.id)
    const entryFileNames = this.outputOptions.entryFileNames
    if (typeof entryFileNames === 'function') {
      return entryFileNames({
        name,
        facadeModuleId: file.id,
        type: 'chunk',
      })
    }

    if (entryFileNames) return renderPattern(entryFileNames, { name })
    return name.endsWith('.js') ? name : `${name}.js`
  }

  private async processEmittedChunks(plugins: CrxPlugin[]) {
    for (const data of this.emitted.values()) {
      if (data.file.type !== 'chunk' || data.processed) continue
      data.processed = true

      const loaded = await this.load(data.file.id, plugins)
      if (!loaded)
        throw new Error(`Unable to load emitted chunk "${data.file.id}"`)

      const transformed = await this.transform(loaded.code, data.file.id, plugins)
      const code = transformed?.code ?? loaded.code
      const map = transformed?.map ?? loaded.map

      this.bundle[data.fileName] = {
        type: 'chunk',
        fileName: data.fileName,
        code,
        facadeModuleId: data.file.id,
        imports: [],
        dynamicImports: [],
        exports: [],
        modules: { [data.file.id]: {} },
        isEntry: true,
        map,
      }
    }
  }

  private async load(id: string, plugins: CrxPlugin[]) {
    for (const plugin of plugins) {
      const load = getHook(plugin.load)
      if (!load) continue
      const runLoad = load as unknown as (
        this: CrxPluginContext,
        id: string,
      ) => LoadResult | Promise<LoadResult>
      const result = normalizeLoadResult(await runLoad.call(this.context, id))
      if (result) return result
    }
    return null
  }

  private async transform(code: string, id: string, plugins: CrxPlugin[]) {
    let current = code
    let map: unknown

    for (const plugin of plugins) {
      const transform = getHook(plugin.transform)
      if (!transform) continue
      const runTransform = transform as unknown as (
        this: CrxPluginContext,
        code: string,
        id: string,
      ) => TransformResult | Promise<TransformResult>
      const result = normalizeTransformResult(
        await runTransform.call(this.context, current, id),
      )
      if (result) {
        current = result.code
        map = result.map
      }
    }

    return { code: current, map }
  }

  private async writeBundle() {
    for (const item of Object.values(this.bundle)) {
      const target = join(this.outputOptions.dir, item.fileName)
      if (item.type === 'asset') {
        await output(item.source, target)
      } else {
        await output(item.code, target)
      }
    }
  }
}

async function output(source: string | Uint8Array, target: string) {
  if (source instanceof Uint8Array) await outputFile(target, source)
  else await outputFile(target, source, { encoding: 'utf8' })
}

export async function writeDevBundle({
  server,
  plugins,
}: {
  server: ViteDevServer
  plugins: CrxPlugin[]
}) {
  const runner = new DevBundleRunner(server, firstOutputOptions(server.config))
  await runner.run(plugins)
}
