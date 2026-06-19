import { mkdtemp, readFile, rm } from 'fs/promises'
import { tmpdir } from 'os'
import type { ViteDevServer } from 'vite'
import { afterEach, describe, expect, test } from 'vitest'
import { writeDevBundle } from './devBundleRunner'
import { join } from './path'
import type {
  CrxOutputBundle,
  CrxPlugin,
  CrxPluginContext,
} from './types'

const tempRoots: string[] = []

afterEach(async () => {
  await Promise.all(
    tempRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  )
})

async function createRoot() {
  const root = await mkdtemp(join(tmpdir(), 'crx-dev-bundle-'))
  tempRoots.push(root)
  return root
}

function createServer(root: string): ViteDevServer {
  return {
    config: {
      root,
      build: {
        outDir: 'dist',
        rollupOptions: {
          output: {
            assetFileNames: 'assets/[name][extname]',
            entryFileNames: 'entries/[name].js',
          },
        },
      },
    },
    pluginContainer: {
      resolveId: async (source: string) => ({ id: `/resolved/${source}` }),
    },
  } as unknown as ViteDevServer
}

describe('writeDevBundle', () => {
  test('runs dev bundle hooks with write semantics and writes emitted files', async () => {
    const root = await createRoot()
    const calls: string[] = []
    let isWrite: boolean | undefined
    let assetFileName: string | undefined
    let resolvedId: string | undefined

    const plugin = {
      name: 'crx:test-dev-bundle',
      options(this: CrxPluginContext, options: Record<string, unknown>) {
        calls.push(`options:${options.input}`)
        return { input: 'stub-input' }
      },
      async buildStart(
        this: CrxPluginContext,
        options: Record<string, unknown>,
      ) {
        calls.push(`buildStart:${options.input}`)

        const parsed = this.parse('export const value = 1')
        expect(parsed.type).toBe('Program')

        const resolved = await this.resolve('./dep', '/entry.ts', {
          skipSelf: true,
        })
        resolvedId = resolved?.id

        const assetRef = this.emitFile({
          type: 'asset',
          name: 'dev-base.txt',
        })
        assetFileName = this.getFileName(assetRef)
        this.setAssetSource(assetRef, 'asset from setAssetSource')

        this.emitFile({
          type: 'chunk',
          id: '/entry.ts',
          name: 'entry',
        })
      },
      load(this: CrxPluginContext, id: string) {
        calls.push(`load:${id}`)
        if (id === '/entry.ts') return 'export const value = 1'
      },
      transform(this: CrxPluginContext, code: string, id: string) {
        calls.push(`transform:${id}`)
        return `${code}\nconsole.log(value)`
      },
      generateBundle(
        this: CrxPluginContext,
        _options: Record<string, unknown>,
        bundle: CrxOutputBundle,
        write: boolean,
      ) {
        calls.push(`generateBundle:${write}`)
        isWrite = write

        expect(bundle['assets/dev-base.txt']?.type).toBe('asset')
        expect(bundle['entries/entry.js']?.type).toBe('chunk')

        this.emitFile({
          type: 'asset',
          fileName: 'late-asset.txt',
          source: 'asset from generateBundle',
        })
      },
    } as unknown as CrxPlugin

    await writeDevBundle({ server: createServer(root), plugins: [plugin] })

    expect(calls).toEqual([
      'options:index.html',
      'buildStart:stub-input',
      'load:/entry.ts',
      'transform:/entry.ts',
      'generateBundle:true',
    ])
    expect(isWrite).toBe(true)
    expect(assetFileName).toBe('assets/dev-base.txt')
    expect(resolvedId).toBe('/resolved/./dep')
    await expect(
      readFile(join(root, 'dist/assets/dev-base.txt'), 'utf8'),
    ).resolves.toBe('asset from setAssetSource')
    await expect(
      readFile(join(root, 'dist/entries/entry.js'), 'utf8'),
    ).resolves.toBe('export const value = 1\nconsole.log(value)')
    await expect(
      readFile(join(root, 'dist/late-asset.txt'), 'utf8'),
    ).resolves.toBe('asset from generateBundle')
  })
})
