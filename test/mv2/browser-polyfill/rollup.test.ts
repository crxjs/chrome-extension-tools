import { isAsset, isChunk } from '$src/helpers'
import { getRollupOutput } from '$test/helpers/getRollupOutput'
import { byFileName } from '$test/helpers/utils'
import { OutputAsset } from 'rollup'

const outputPromise = getRollupOutput(
  __dirname,
  'rollup.config.js',
)

test('bundles chunks', async () => {
  const { output } = await outputPromise

  // Chunks
  const chunks = output.filter(isChunk)

  expect(
    output.find(byFileName('scripts/background.js')),
  ).toBeDefined()
  expect(
    output.find(byFileName('scripts/content.js')),
  ).toBeDefined()
  expect(
    output.find(byFileName('options/options.js')),
  ).toBeDefined()
  expect(output.find(byFileName('popup/popup.js'))).toBeDefined()

  // 4 chunks + one shared import (shared.js)
  expect(chunks.length).toBe(5)
})

test('bundles assets', async () => {
  const { output } = await outputPromise

  // Assets
  const assets = output.filter(isAsset)

  expect(
    output.find(
      byFileName('assets/browser-polyfill-executeScript.js'),
    ),
  ).toBeDefined()
  expect(
    output.find(byFileName('assets/browser-polyfill.js')),
  ).toBeDefined()

  // 11 assets + 1 wrapper script + 2 browser polyfills
  expect(assets.length).toBe(14)
})

// TODO: test browser polyfill in MV3 variant
test('includes browser polyfill in manifest.json', async () => {
  const { output } = await outputPromise

  const manifestAsset = output.find(
    byFileName('manifest.json'),
  ) as OutputAsset
  const manifestSource = manifestAsset.source as string
  const manifest: chrome.runtime.ManifestV2 =
    JSON.parse(manifestSource)

  expect(manifest.background?.scripts?.[0]).toBe(
    'assets/browser-polyfill.js',
  )
  expect(manifest.background?.scripts?.[1]).toBe(
    'assets/browser-polyfill-executeScript.js',
  )

  manifest.content_scripts?.forEach(({ js = [] }) => {
    expect(js[0]).toBe('assets/browser-polyfill.js')
    expect(js[1]).not.toBe(
      'assets/browser-polyfill-executeScript.js',
    )
  })
})
