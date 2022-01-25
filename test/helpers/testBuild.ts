import { parseManifest } from '$src/files_parseManifest'
import { isChunk, isOutputOptions } from '$src/helpers'
import type { Manifest } from '$src/types'
import { byFileName } from '$test/helpers/utils'
import fs from 'fs-extra'
import glob from 'glob'
import path from 'path'
import {
  OutputAsset as Asset,
  rollup,
  RollupOptions,
  RollupOutput,
} from 'rollup'
import { build } from 'vite'
import { stubDate } from './stubDate'
import { SpecialFilesMap } from './testServe'

/* ------------------ SETUP TESTS ------------------ */
stubDate()

export async function getRollupOutput(dirname: string) {
  process.chdir(dirname)

  const configFile = path.join(dirname, 'rollup.config.js')
  const { output, ...config } = require(configFile)
    .default as RollupOptions

  if (!isOutputOptions(output))
    throw new TypeError(
      `config.output missing or malformed: ${configFile}`,
    )

  // Rollup doesn't write to fs
  // const outDir = path.join(path.dirname(configFile), output.dir!)
  // await fs.remove(outDir)

  const bundle = await rollup(config)
  const { output: result } = await bundle.generate(output)

  return result
}

export async function getViteBuildOutput(dirname: string) {
  process.chdir(dirname)

  const outDir = path.join(dirname, 'dist-build')

  // Need to remove old outDir
  await fs.remove(outDir)

  const { output } = (await build({
    configFile: path.join(dirname, 'vite.config.ts'),
    envFile: false,
    build: { outDir },
  })) as RollupOutput

  return output
}

export async function testBuildOutput(
  output: RollupOutput['output'],
  specialFiles: SpecialFilesMap = new Map(),
) {
  const specialTests = [...specialFiles.keys()]
  const findSpecial = (name: string) =>
    specialTests.find((x) =>
      x instanceof RegExp ? x.test(name) : x === name,
    )

  const { source } = output.find(
    byFileName('manifest.json'),
  ) as Asset & { source: string }
  const manifest: Manifest = JSON.parse(source)

  // Manifest has not changed
  if (specialFiles.has('manifest.json')) {
    specialFiles.get('manifest.json')!(source, '00 - manifest')
  } else {
    expect(manifest).toMatchSnapshot('00 - manifest')
  }

  // Manifest files have not changed
  const parsed = parseManifest(manifest)
  expect(parsed).toMatchSnapshot('01 - files from manifest')

  // Output files list has not changed
  const files = output.map(({ fileName }) => fileName).sort()
  expect(files).toMatchSnapshot('02 - files from output')

  // All files in output have not changed
  for (const file of output) {
    const { fileName } = file
    if (fileName === 'manifest.json') continue
    const source = isChunk(file) ? file.code : file.source
    if (source instanceof Uint8Array) continue

    // Output files have not changed
    const key = findSpecial(fileName)
    if (key) {
      specialFiles.get(key)!(source, fileName)
    } else {
      expect(source).toMatchSnapshot(fileName)
    }
  }

  // All files in manifest are in output files
  const manifestFiles = new Map()
  for (const file of Object.values(parsed).flat().sort()) {
    if (glob.hasMagic(file)) continue
    manifestFiles.set(file, files.includes(file))
  }
  expect(Object.fromEntries(manifestFiles)).toMatchSnapshot(
    '03 - manifest files match output',
  )
  expect([...manifestFiles.values()].every((x) => x)).toBe(true)
}
