import { afterEach, expect, test } from 'vitest'
import { firstValueFrom } from 'rxjs'
import { outputFiles, type OutputFile } from './fileWriter-filesMap'
import { allFilesReady$, fileWriterEvent$ } from './fileWriter-rxjs'

afterEach(() => {
  outputFiles.clear()
})

test('shares allFilesReady work across subscribers', async () => {
  let awaits = 0
  const file = {
    id: '/src/content.ts',
    type: 'module',
    fileName: 'src/content.ts.js',
    file: {
      then(resolve: (value: { deps: OutputFile[] }) => void) {
        awaits += 1
        return Promise.resolve({ deps: [] }).then(resolve)
      },
    },
  } as OutputFile

  outputFiles.set(file.fileName, file)

  const first = firstValueFrom(allFilesReady$)
  const second = firstValueFrom(allFilesReady$)

  fileWriterEvent$.next({ type: 'build_end' })

  await Promise.all([first, second])

  expect(awaits).toBe(1)
})

test('deduplicates dependency traversal within an allFilesReady generation', async () => {
  let sharedDepAwaits = 0

  const sharedDep = {
    id: '/src/shared.ts',
    type: 'module',
    fileName: 'src/shared.ts.js',
    file: {
      then(resolve: (value: { deps: OutputFile[] }) => void) {
        sharedDepAwaits += 1
        return Promise.resolve({ deps: [] }).then(resolve)
      },
    },
  } as OutputFile

  const firstRoot = {
    id: '/src/content-a.ts',
    type: 'module',
    fileName: 'src/content-a.ts.js',
    file: Promise.resolve({ deps: [sharedDep] }),
  } as OutputFile

  const secondRoot = {
    id: '/src/content-b.ts',
    type: 'module',
    fileName: 'src/content-b.ts.js',
    file: Promise.resolve({ deps: [sharedDep] }),
  } as OutputFile

  outputFiles.set(sharedDep.fileName, sharedDep)
  outputFiles.set(firstRoot.fileName, firstRoot)
  outputFiles.set(secondRoot.fileName, secondRoot)

  const ready = firstValueFrom(allFilesReady$)
  fileWriterEvent$.next({ type: 'build_end' })

  await ready

  expect(sharedDepAwaits).toBe(1)
})
