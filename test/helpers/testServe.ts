import { parseManifest } from '$src/files_parseManifest'
import {
  filesReady,
  stopFileWriter,
} from '$src/plugin-viteServeFileWriter'
import { isMV2 } from '$src/types'
import fs from 'fs-extra'
import globCb, { hasMagic } from 'glob'
import path from 'path'
import { createServer, Manifest, ViteDevServer } from 'vite'
import { mockDate } from './mockDate'

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
  (
    source: string,
    snapshotName: string,
    matcher?: Record<string, any>,
  ) => void
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

  const desc: Partial<Manifest> = {
    description: expect.stringMatching(/\[.+?\] Waiting/),
  }
  const csp: Partial<Manifest> = isMV2(manifest)
    ? {
        content_security_policy: expect.stringMatching(
          /script-src 'self' http:\/\/localhost:\d{4}; object-src 'self'/,
        ),
      }
    : {}
  const matcher: Partial<Manifest> = { ...desc, ...csp }

  // Manifest has not changed
  if (specialFiles.has('manifest.json')) {
    const source = JSON.stringify(manifest)
    specialFiles.get('manifest.json')!(
      source,
      '00 - manifest',
      matcher,
    )
  } else {
    expect(manifest).toMatchSnapshot(matcher, '00 - manifest')
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
    const replaced = source.replace(
      /auto-reloader\\n\[.+?\] Waiting/g,
      'auto-reloader\\n[TIMESTAMP] Waiting',
    )

    const key = findSpecial(fileName)
    if (key) {
      specialFiles.get(key)!(replaced, fileName)
    } else {
      expect(replaced).toMatchSnapshot(fileName)
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
