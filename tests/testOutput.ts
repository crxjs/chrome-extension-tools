import fg from 'fast-glob'
import fs from 'fs-extra'
import jsesc from 'jsesc'
import { manifestFiles, _debug } from 'src/helpers'
import { ManifestV3 } from 'src/manifest'
import { join } from 'src/path'
import { ResolvedConfig } from 'vite'
import { defaultTest, isTextFile } from './runners'

export async function testOutput(
  { outDir, config }: { outDir: string; config: ResolvedConfig },
  tests: Map<
    string | RegExp,
    (source: string, name: string) => void
  > = new Map(),
) {
  const debug = _debug('test:output')
  debug('start %s', outDir)

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

  getTest('manifest.json', (source, name) => {
    const manifest: ManifestV3 = JSON.parse(source)
    expect(manifest).toMatchSnapshot(name)
  })(JSON.stringify(manifest), '_00 manifest.json')

  const files = await fg(`**/*`, { cwd: outDir })

  expect(files.sort()).toMatchSnapshot('_01 output files')

  const rootRegex = new RegExp(jsesc(config.root), 'g')
  for (const file of files) {
    if (file.includes('vendor')) continue
    if (file.includes('react-refresh')) continue
    if (file.includes('content-script-client')) continue
    if (file.includes('webcomponents-custom-elements')) continue
    if (isTextFile(file)) {
      const filename = join(outDir, file)
      let source = await fs.readFile(filename, { encoding: 'utf8' })
      if (config?.command === 'serve')
        source = source
          .replace(/localhost:\d{4}/g, `localhost:3000`)
          .replace(/url\.port = "\d{4}"/, `url.port = "3000"`)
          .replace(rootRegex, '<root>')
      getTest(file)(source, file)
    }
  }

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
