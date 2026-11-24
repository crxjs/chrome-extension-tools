import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import type { ViteDevServer } from 'vite'

vi.mock('fs-extra', () => ({ default: { outputFile: vi.fn() } }))

let writer: typeof import('./fileWriter')
let files: typeof import('./fileWriter-filesMap')
let events: typeof import('./fileWriter-rxjs')
let outputFile: ReturnType<typeof vi.fn>
let transformRequest: ReturnType<typeof vi.fn>
let imports: Record<string, string[]>
let revision: number

beforeEach(async () => {
  vi.resetModules()
  writer = await import('./fileWriter')
  files = await import('./fileWriter-filesMap')
  events = await import('./fileWriter-rxjs')
  outputFile = vi.mocked((await import('fs-extra')).default.outputFile)
  outputFile.mockReset().mockResolvedValue(undefined)
  imports = {}
  revision = 1
  transformRequest = vi.fn(async (id: string) => ({
    // Bound the old implementation's loop without relying on a timeout.
    code:
      transformRequest.mock.calls.length > 12
        ? ''
        : (imports[id] ?? []).map((dep) => `import '${dep}'`).join('\n') +
          `\nexport const revision = ${revision}`,
  }))
  events.serverEvent$.next({
    type: 'start',
    server: {
      config: { root: '/project', build: { outDir: 'dist' }, plugins: [] },
      transformRequest,
    } as unknown as ViteDevServer,
  })
})

afterEach(async () => {
  await writer.close()
  events.serverEvent$.complete()
  events.fileWriterEvent$.complete()
  files.outputFiles.clear()
})

const add = (id: string) => writer.add({ id, type: 'module' })

// Follow newly discovered dependencies and replacement promises, including
// queued writes. A stable map means no write can enqueue another dependency.
async function drain() {
  for (let round = 0; round < 20; round++) {
    const pending = [...files.outputFiles.values()].map((file) => file.file)
    await Promise.all(pending)
    const current = [...files.outputFiles.values()].map((file) => file.file)
    if (
      current.length === pending.length &&
      current.every((p, i) => p === pending[i])
    )
      return
  }
  throw new Error('File writer did not settle')
}

function deferred() {
  let resolve!: () => void
  const promise = new Promise<void>((done) => {
    resolve = done
  })
  return { promise, resolve }
}

describe('timestamped module writes', () => {
  test.each([2, 3])(
    'settles a cycle of %i modules after successive HMR updates',
    async (size) => {
      const names = ['a', 'b', 'c'].slice(0, size)
      for (const timestamp of [1, 2, 3]) {
        imports = Object.fromEntries(
          names.map((name, i) => [
            `/src/${name}.ts?t=${timestamp}`,
            [`/src/${names[(i + 1) % size]}.ts?t=${timestamp}`],
          ]),
        )
        add(`/src/a.ts?t=${timestamp}`)
        await drain()
        expect(transformRequest).toHaveBeenCalledTimes(size * timestamp)
        expect(outputFile).toHaveBeenCalledTimes(size * timestamp)
      }
    },
  )

  test('deduplicates the same version while queued, writing, and completed, normalizing the slash', async () => {
    const started = deferred()
    const release = deferred()
    outputFile.mockImplementationOnce(() => {
      started.resolve()
      return release.promise
    })
    const first = add('src/a.ts?t=1')
    expect(add('/src/a.ts?t=1')).toBe(first)
    await started.promise
    try {
      expect(add('/src/a.ts?t=1')).toBe(first)
      const next = add('/src/a.ts?t=2')
      expect(add('src/a.ts?t=2')).toBe(next)
      expect(transformRequest).toHaveBeenCalledTimes(1)
    } finally {
      release.resolve()
    }
    await drain()
    const completed = files.outputFiles.get('src/a.ts.js')!
    expect(add('src/a.ts?t=2')).toBe(completed)
    await drain()
    expect(transformRequest).toHaveBeenCalledTimes(2)
  })

  test('preserves module variants and explicit updates of the same version', async () => {
    add('/src/a.ts?t=1&raw')
    add('/src/a.ts?t=1&url')
    await drain()
    expect(files.outputFiles.size).toBe(2)
    expect(add('src/a.ts?t=1&raw').id).toBe('/src/a.ts?t=1&raw')
    revision = 2
    expect(writer.update('/src/a.ts')).toHaveLength(2)
    await drain()
    expect(transformRequest).toHaveBeenCalledTimes(4)
    expect(
      outputFile.mock.calls
        .slice(-2)
        .every((call) => call[1].includes('revision = 2')),
    ).toBe(true)
  })

  test.each(['/@id/virtual.css', '/__uno.css'])(
    'refreshes virtual module %s with an identical ID',
    async (id) => {
      add(id)
      await drain()
      revision = 2
      add(id)
      await drain()
      expect(transformRequest).toHaveBeenCalledTimes(2)
      expect(outputFile.mock.calls[1][1]).toContain('revision = 2')
    },
  )

  test('serializes two rapid timestamps and leaves the latest content', async () => {
    const started = deferred()
    const release = deferred()
    outputFile.mockImplementationOnce(() => {
      started.resolve()
      return release.promise
    })
    add('/src/a.ts?t=1')
    await started.promise
    try {
      add('/src/a.ts?t=2')
      add('/src/a.ts?t=3')
      revision = 3
      expect(transformRequest).toHaveBeenCalledTimes(1)
    } finally {
      release.resolve()
    }
    await drain()
    expect(transformRequest.mock.calls.map(([id]) => id)).toEqual([
      '/src/a.ts?t=1',
      '/src/a.ts?t=2',
      '/src/a.ts?t=3',
    ])
    expect(outputFile).toHaveBeenCalledTimes(3)
    expect(outputFile.mock.calls[2][1]).toContain('revision = 3')
    expect(add('/src/a.ts?t=3').id).toBe('/src/a.ts?t=3')
    await drain()
    expect(outputFile).toHaveBeenCalledTimes(3)
  })
})
