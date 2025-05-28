import fg from 'fast-glob'
import fs from 'fs-extra'
import jsesc from 'jsesc'
import { join } from 'pathe'
import { manifestFiles } from 'src/files'
import { allFileWriterErrors } from 'src/fileWriter-rxjs'
import { _debug } from 'src/helpers'
import { ManifestV3 } from 'src/manifest'
import { expect } from 'vitest'
import {
  BuildTestResult,
  defaultTest,
  isTextFile,
  ServeTestResult,
} from './runners'

export async function testOutput(
  testResult: BuildTestResult | ServeTestResult,
  tests: Map<
    string | RegExp,
    (source: string, name: string) => void
  > = new Map(),
) {
  const { outDir, config, rootDir } = testResult
  const debug = _debug('test:output')
  debug('start %s', outDir)

  if (testResult.command === 'serve') {
    testResult.server.close()
    const errors = await allFileWriterErrors
    for (const { err } of errors) console.error(err)
    if (errors[0]) throw errors[0].err
  }

  const getTest = (x: string, d = defaultTest): typeof defaultTest => {
    const t = [...tests].find(([k]) =>
      typeof k === 'string' ? k === x : k.test(x),
    )
    return t?.[1] ?? d
  }

  expect(fs.existsSync(outDir)).toBe(true)

  const manifestPath = join(outDir, 'manifest.json')
  const manifest: ManifestV3 = await fs.readJson(manifestPath)

  for (const r of manifest.web_accessible_resources ?? []) {
    r.resources.sort()
    if ('matches' in r) r.matches.sort()
  }

  const hashMap = new Map<string, string>()
  const scrubHashes = (text: string) =>
    text
      .replace(/(\.hash)([a-z0-9]+)\./g, (found, p1) => {
        const replaced =
          hashMap.get(found) ?? `${p1.toString()}${hashMap.size.toString()}.`
        hashMap.set(found, replaced)
        return replaced
      })
      .replace(/(scriptId--)([a-zA-Z0-9]+)\./g, (found, p1) => {
        const replaced =
          hashMap.get(found) ?? `${p1.toString()}${hashMap.size.toString()}.`
        hashMap.set(found, replaced)
        return replaced
      })
      .replace(/(v--)([a-z0-9]+)\./g, '$1hash.')
      .replaceAll(/\/\/#(.+?base64,)([^\s]+)/g, '// #$1<base64>')

  getTest('manifest.json', (source, name) => {
    const scrubbed = scrubHashes(source)
    const manifest: ManifestV3 = JSON.parse(scrubbed)
    expect(manifest).toMatchSnapshot(name)
  })(JSON.stringify(manifest), '_00 manifest.json')

  const files = await fg(`**/*`, { cwd: outDir })

  const scrubbedFiles = files.map(scrubHashes).sort()
  expect(scrubbedFiles).toMatchSnapshot('_01 output files')

  for (const file of files) {
    if (file.includes('vendor')) continue
    if (file.includes('react-refresh')) continue
    if (file.includes('content-script-client')) continue
    if (file.includes('webcomponents-custom-elements')) continue
    if (isTextFile(file)) {
      const filename = join(outDir, file)
      let source = scrubHashes(
        await fs.readFile(filename, { encoding: 'utf8' }),
      )

      if (config?.command === 'serve') {
        source = source
          .replace(/localhost:\d{4}/g, `localhost:3000`)
          .replace(/url\.port = "\d{4}"/, `url.port = "3000"`)

        source = source
          .replaceAll(config.root, '<root>')
          .replaceAll(jsesc(rootDir), '<root>')
          .replaceAll('\\r\\n', '\\n')
          .replaceAll('\\\\', '\\')

        source = source.replace(
            new RegExp('<root>' + '([/\\\\][^"\']+)', 'g'),
          (_, path) => `<root>${path.replaceAll(/\\/g, '/')}`,
        )
      }

      const scrubbed = scrubHashes(file)
      getTest(scrubbed)(source, scrubbed)
    }
  }

  if (config.command === 'serve')
    expect(new Set(config.optimizeDeps.entries)).toMatchSnapshot(
      '_02 optimized deps',
    )

  /* ------------ CHECK FOR MISSING FILES ------------ */
  const missingFiles = Object.values(
    await manifestFiles(manifest, { cwd: outDir }),
  )
    .flat()
    .sort()
    .filter((f) => !files.includes(f))

  // files in manifest not in outDir
  expect(missingFiles).toEqual([])

  if (manifest.default_locale) {
    // the default _locales files should exist if default_locale is set
    expect(
      files.some((f) => f.includes(`_locales/${manifest.default_locale}`)),
    ).toBe(true)
  }
}
