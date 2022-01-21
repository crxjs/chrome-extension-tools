import { parseManifest } from '$src/files_parseManifest'
import {
  filesReady,
  stopFileWriter,
} from '$src/plugin-viteServeFileWriter'
import fs from 'fs-extra'
import globCb from 'glob'
import path from 'path'
import { createServer, ViteDevServer } from 'vite'

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
  __dirname,
}: {
  __dirname: string
}) {
  const outDir = path.join(__dirname, 'dist-serve')

  const shared: {
    devServer?: ViteDevServer
    outDir: string
  } = { outDir }

  beforeAll(async () => {
    await fs.remove(outDir)

    shared.devServer = await createServer({
      configFile: path.join(__dirname, 'vite.config.ts'),
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
  (filename: string, source: string) => void
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
  const isSpecial = (name: string) =>
    specialTests.some((x) =>
      x instanceof RegExp ? x.test(name) : x === name,
    )

  expect(fs.existsSync(outDir)).toBe(false)

  expect(devServer).toBeDefined()
  await Promise.all([devServer!.listen(), filesReady()])

  expect(fs.existsSync(outDir)).toBe(true)

  const manifestPath = path.join(outDir, 'manifest.json')
  const manifest = await fs.readJson(manifestPath)
  // Manifest has not changed
  expect(manifest).toMatchSnapshot('00 - manifest')

  // Manifest files have not changed
  const parsed = parseManifest(manifest)
  expect(parsed).toMatchSnapshot('01 - files from manifest')

  const filepaths: string[] = await glob(`${outDir}/**/*`, {
    nodir: true,
  })
  const files = new Set()
  for (const filepath of filepaths) {
    const source = await fs.readFile(filepath, 'utf8')
    const fileName = path.relative(outDir, filepath)
    files.add(fileName)

    // Output files have not changed
    if (isSpecial(fileName)) {
      specialFiles.get(fileName)!(fileName, source)
    } else {
      expect(source).toMatchSnapshot(fileName)
    }
  }

  // Output files list has not changed
  expect([...files]).toMatchSnapshot('02 - files from outDir')

  // All files in manifest are in output files
  for (const file of Object.values(parsed).flatMap((x) => x)) {
    expect(files.has(file)).toBe(true)
  }
}
