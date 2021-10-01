import { isAsset, isChunk } from '$src/helpers'
import { getRollupOutput } from '$test/helpers/getRollupOutput'
import { jestSetTimeout } from '$test/helpers/timeout'
import { byFileName } from '$test/helpers/utils'
import { OutputAsset } from 'rollup'

jestSetTimeout(30000)

test('bundles chunks', async () => {
  const { output } = await getRollupOutput(
    __dirname,
    'rollup.config.js',
  )

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

  // Assets
  const assets = output.filter(isAsset)

  expect(
    output.find(byFileName('browser-polyfill.js')),
  ).toBeDefined()
  expect(
    output.find(byFileName('browser-polyfill-executeScript.js')),
  ).toBeDefined()

  // 11 assets + 1 wrapper script + 2 browser polyfills
  expect(assets.length).toBe(14)

  // TODO: test browser polyfill in MV3 variant

  const manifestAsset = output.find(
    byFileName('manifest.json'),
  ) as OutputAsset
  const manifestSource = manifestAsset.source as string
  const manifest: chrome.runtime.ManifestV2 =
    JSON.parse(manifestSource)

  expect(manifest.background?.scripts?.[0]).toBe(
    'browser-polyfill.js',
  )
  expect(manifest.background?.scripts?.[1]).toBe(
    'browser-polyfill-executeScript.js',
  )

  manifest.content_scripts?.forEach(({ js = [] }) => {
    expect(js[0]).toBe('browser-polyfill.js')
    expect(js[1]).not.toBe('browser-polyfill-executeScript.js')
  })
})
