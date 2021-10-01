import { isAsset, isChunk } from '$src/helpers'
import { getRollupOutput } from '$test/helpers/getRollupOutput'
import { byFileName } from '$test/helpers/utils'
import { readJSONSync } from 'fs-extra'
import path from 'path'
import { OutputAsset } from 'rollup'

const manifestJson = readJSONSync(
  path.join(__dirname, 'manifest.json'),
)

test('bundles extended manifest', async () => {
  const { output } = await getRollupOutput(
    __dirname,
    'rollup.config.js',
  )

  const manifestAsset = output.find(
    byFileName('manifest.json'),
  ) as OutputAsset
  const manifest = JSON.parse(
    manifestAsset.source as string,
  ) as chrome.runtime.Manifest

  // Changes from extendManifest
  expect(manifest).toMatchObject({
    name: manifestJson.name + '123',
    description: manifestJson.description
      .split('')
      .reverse()
      .join(''),
    background: {
      persistent: true,
      scripts: ['background.esm-wrapper.js'],
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

  // Chunks
  const chunks = output.filter(isChunk)

  expect(output.find(byFileName('background.js'))).toBeDefined()
  expect(output.find(byFileName('options.js'))).toBeDefined()

  expect(chunks.length).toBe(3)

  // Assets
  const assets = output.filter(isAsset)

  expect(
    output.find(byFileName('images/icon-main-16.png')),
  ).toBeDefined()
  expect(
    output.find(byFileName('images/icon-main-48.png')),
  ).toBeDefined()
  expect(
    output.find(byFileName('images/icon-main-128.png')),
  ).toBeDefined()
  expect(output.find(byFileName('manifest.json'))).toBeDefined()
  expect(output.find(byFileName('options.css'))).toBeDefined()
  expect(output.find(byFileName('options.html'))).toBeDefined()
  expect(output.find(byFileName('options.png'))).toBeDefined()
  expect(
    output.find(byFileName('images/favicon.ico')),
  ).toBeDefined()
  expect(
    output.find(byFileName('background.esm-wrapper.js')),
  ).toBeDefined()

  expect(assets.length).toBe(9)
})
