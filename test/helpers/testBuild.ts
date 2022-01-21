import { parseManifest } from '$src/files_parseManifest'
import { isChunk, isUndefined } from '$src/helpers'
import type { Manifest } from '$src/types'
import { byFileName } from '$test/helpers/utils'
import path from 'path'
import {
  OutputAsset as Asset,
  OutputOptions,
  rollup,
  RollupOptions,
  RollupOutput,
} from 'rollup'
import { build } from 'vite'
import fs from 'fs-extra'

const isOutputOptions = (x: unknown): x is OutputOptions =>
  !isUndefined(x) && !Array.isArray(x)

export async function getRollupOutput(dirname: string) {
  const configFile = path.join(dirname, 'rollup.config.js')
  const { output, ...config } = require(configFile)
    .default as RollupOptions

  if (!isOutputOptions(output))
    throw new TypeError(`config.output missing: ${configFile}`)

  // Rollup doesn't write to fs
  // const outDir = path.join(path.dirname(configFile), output.dir!)
  // await fs.remove(outDir)

  const bundle = await rollup(config)
  const { output: result } = await bundle.generate(output)

  return result
}

export async function getViteBuildOutput(dirname: string) {
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
  specialFiles: Map<
    string | RegExp,
    (source: string, snapshotName: string) => void
  > = new Map(),
) {
  const specialTests = [...specialFiles.keys()]
  const isSpecial = (name: string) =>
    specialTests.some((x) =>
      x instanceof RegExp ? x.test(name) : x === name,
    )

  const { source } = output.find(
    byFileName('manifest.json'),
  ) as Asset & { source: string }
  const manifest: Manifest = JSON.parse(source)
  // Manifest has not changed
  expect(manifest).toMatchSnapshot('00 - manifest')

  // Manifest files have not changed
  const parsed = parseManifest(manifest)
  expect(parsed).toMatchSnapshot('01 - files from manifest')

  // Output files list has not changed
  const files = output.map(({ fileName }) => fileName)
  expect(files).toMatchSnapshot('02 - files from output')

  // All files in output have not changed
  for (const file of output) {
    const { fileName } = file
    const source = isChunk(file) ? file.code : file.source
    if (source instanceof Uint8Array) continue

    if (isSpecial(fileName)) {
      specialFiles.get(fileName)!(source, fileName)
    } else {
      expect(source).toMatchSnapshot(fileName)
    }
  }

  // All files in manifest are in output files
  for (const file of Object.values(parsed).flatMap((x) => x)) {
    expect(files.includes(file)).toBe(true)
  }
}
