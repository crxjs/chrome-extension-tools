import { parseManifest } from '$src/files_parseManifest'
import { isChunk, isOutputOptions } from '$src/helpers'
import { isMV2, Manifest } from '$src/types'
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
import { mockDate } from './mockDate'
import { SpecialFilesMap } from './testServe'

/* ------------------ SETUP TESTS ------------------ */
mockDate()

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

const isVendorChunk = (x: string) => /vendor-.{8}\.js$/.test(x)
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
  const manifest: Manifest = JSON.parse(
    source.replace(
      /http:\/\/localhost:\d{4}/g,
      'http://localhost:3000',
    ),
  )

  // Manifest has not changed
  if (specialFiles.has('manifest.json')) {
    specialFiles.get('manifest.json')!(source, '00 - manifest')
  } else if (!manifest.web_accessible_resources) {
    expect(manifest).toMatchSnapshot('00 - manifest')
  } else if (isMV2(manifest)) {
    manifest.web_accessible_resources =
      manifest.web_accessible_resources
        ?.map((x) => (isVendorChunk(x) ? 'vendor chunk' : x))
        .sort()

    expect(manifest).toMatchSnapshot('00 - manifest')
  } else {
    for (const x of manifest.web_accessible_resources) {
      x.resources = x.resources
        .map((x) => (isVendorChunk(x) ? 'vendor chunk' : x))
        .sort()
    }

    expect(manifest).toMatchSnapshot('00 - manifest')
  }

  // Manifest files have not changed
  const parsed = parseManifest(manifest)
  expect(parsed).toMatchSnapshot('01 - files from manifest')

  // Output files list has not changed
  let vendorChunk: string | undefined
  const files = output
    .map(({ fileName }) => {
      if (isVendorChunk(fileName)) {
        vendorChunk = fileName
        return 'vendor chunk'
      }
      return fileName
    })
    .sort()
  expect(files).toMatchSnapshot('02 - files from output')

  // All files in output have not changed
  for (const file of output) {
    const { fileName } = file
    if (fileName === 'manifest.json' || isVendorChunk(fileName))
      continue

    const source = isChunk(file) ? file.code : file.source
    if (source instanceof Uint8Array) continue

    const replaced = vendorChunk
      ? source.replace(vendorChunk, 'vendor-chunk.js')
      : source

    // Output files have not changed
    const key = findSpecial(fileName)
    if (key) {
      specialFiles.get(key)!(replaced, fileName)
    } else {
      expect(replaced).toMatchSnapshot(fileName)
    }
  }

  // All files in manifest are in output files
  const manifestFiles = new Map()
  for (const file of Object.values(parsed).flat().sort()) {
    if (glob.hasMagic(file) || isVendorChunk(file)) continue
    manifestFiles.set(file, files.includes(file))
  }
  expect(Object.fromEntries(manifestFiles)).toMatchSnapshot(
    '03 - manifest files match output',
  )
  expect([...manifestFiles.values()].every((x) => x)).toBe(true)
}
