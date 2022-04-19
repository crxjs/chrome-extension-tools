import { OutputAsset, rollup, RollupOptions, RollupOutput } from 'rollup'
import { isAsset, isChunk } from '../src/helpers'
import { byFileName, loadCrxJson, requireExtFile } from '../__fixtures__/utils'

let outputPromise: Promise<RollupOutput>
beforeAll(async () => {
  const config = requireExtFile(__filename, 'rollup.config.js') as RollupOptions
  outputPromise = rollup(config).then((bundle) => bundle.generate(config.output as any))
  return outputPromise
}, 45000)

const manifestJson = loadCrxJson(__filename, 'manifest.json')

test('bundles chunks', async () => {
  const { output } = await outputPromise

  // Chunks
  const chunks = output.filter(isChunk)
  expect(chunks.length).toBe(3)

  expect(output.find(byFileName('background.js'))).toBeDefined()
  expect(output.find(byFileName('options.js'))).toBeDefined()
})

test(
  'bundles assets',
  async () => {
    const { output } = await outputPromise

    // Assets
    const assets = output.filter(isAsset)
    expect(assets.length).toBe(9)

    // 4 assets + 1 wrapper script
    expect(output.find(byFileName('images/icon-main-16.png'))).toBeDefined()
    expect(output.find(byFileName('images/icon-main-48.png'))).toBeDefined()
    expect(output.find(byFileName('images/icon-main-128.png'))).toBeDefined()
    expect(output.find(byFileName('manifest.json'))).toBeDefined()
    expect(output.find(byFileName('options.css'))).toBeDefined()
    expect(output.find(byFileName('options.html'))).toBeDefined()
    expect(output.find(byFileName('options.png'))).toBeDefined()
    expect(output.find(byFileName('images/favicon.ico'))).toBeDefined()
  },
  5 * 60 * 1000,
)

test('extends the manifest', async () => {
  const { output } = await outputPromise

  const manifestAsset = output.find(byFileName('manifest.json')) as OutputAsset
  const manifest = JSON.parse(manifestAsset.source as string) as chrome.runtime.Manifest

  // Changes from extendManifest
  expect(manifest).toMatchObject({
    name: manifestJson.name + '123',
    description: manifestJson.description.split('').reverse().join(''),
    background: {
      persistent: true,
      scripts: [expect.stringMatching(/^assets\/background.+\.js$/)],
    },
    options_page: 'options.html',
  })

  // Original data from manifest.json
  expect(manifest).toMatchObject({
    manifest_version: 2,
    version: '1.0.0',
    icons: {
      '16': 'images/icon-main-16.png',
      '48': 'images/icon-main-48.png',
      '128': 'images/icon-main-128.png',
    },
  })
})
