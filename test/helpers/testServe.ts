import { parseManifest } from '$src/files_parseManifest'
import {
  filesReady,
  stopFileWriter,
} from '$src/plugin-viteServeFileWriter'
import fs from 'fs-extra'
import globCb, { hasMagic } from 'glob'
import path from 'path'
import { createServer, ViteDevServer } from 'vite'
import { mockDate } from './stubDate'

/* ------------------ SETUP TESTS ------------------ */
mockDate()

export const glob = (
  pattern: string,
  options?: globCb.IOptions,
): Promise<string[]> =>
  new Promise((resolve, reject) => {
    options
      ? globCb(pattern, options, (err, matches) => {
          if (err) reject(err)
          else resolve(matches)
        })
      : globCb(pattern, (err, matches) => {
          if (err) reject(err)
          else resolve(matches)
        })
  })

export function setupViteServe({
  dirname,
}: {
  dirname: string
}) {
  process.chdir(dirname)

  const outDir = path.join(dirname, 'dist-serve')

  const shared: {
    devServer?: ViteDevServer
    outDir: string
  } = { outDir }

  beforeAll(async () => {
    await fs.remove(outDir)

    shared.devServer = await createServer({
      configFile: path.join(dirname, 'vite.config.ts'),
      envFile: false,
      build: { outDir },
    })
  })

  afterAll(async () => {
    stopFileWriter()
    await shared.devServer?.close()
  })

  return shared
}

export type SpecialFilesMap = Map<
  string | RegExp,
  // TODO: make sure these files are the same
  (source: string, snapshotName: string) => void
>

export async function testViteServe(
  {
    devServer,
    outDir,
  }: {
    devServer?: ViteDevServer
    outDir: string
  },
  specialFiles: SpecialFilesMap = new Map(),
) {
  const specialTests = [...specialFiles.keys()]
  const findSpecial = (name: string) =>
    specialTests.find((x) =>
      x instanceof RegExp ? x.test(name) : x === name,
    )

  expect(fs.existsSync(outDir)).toBe(false)

  expect(devServer).toBeDefined()
  await Promise.all([devServer!.listen(), filesReady()])

  expect(fs.existsSync(outDir)).toBe(true)

  const manifestPath = path.join(outDir, 'manifest.json')
  const manifest = await fs.readJson(manifestPath)

  // Manifest has not changed
  if (specialFiles.has('manifest.json')) {
    const source = JSON.stringify(manifest)
    specialFiles.get('manifest.json')!(source, '00 - manifest')
  } else {
    expect(manifest).toMatchSnapshot('00 - manifest')
  }

  // Manifest files have not changed
  const parsed = parseManifest(manifest)
  expect(parsed).toMatchSnapshot('01 - files from manifest')

  // Output files have not changed
  const filepaths: string[] = await glob(`${outDir}/**/*`, {
    nodir: true,
  })
  filepaths.sort()
  const files = new Set()
  for (const filepath of filepaths) {
    const fileName = path.relative(outDir, filepath)
    files.add(fileName)

    if (filepath === manifestPath) continue

    const source = await fs.readFile(filepath, 'utf8')

    const key = findSpecial(fileName)
    if (key) {
      specialFiles.get(key)!(source, fileName)
    } else {
      expect(source).toMatchSnapshot(fileName)
    }
  }

  // Output files list has not changed
  expect([...files]).toMatchSnapshot('02 - files from outDir')

  // All files in manifest are in output files
  const manifestFiles = new Map()
  for (const file of Object.values(parsed).flat().sort()) {
    if (hasMagic(file)) continue
    manifestFiles.set(file, files.has(file))
  }
  expect(Object.fromEntries(manifestFiles)).toMatchSnapshot(
    '03 - manifest files match output',
  )
  expect([...manifestFiles.values()].every((x) => x)).toBe(true)
}
