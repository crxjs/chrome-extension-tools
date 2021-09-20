import { readJSONSync } from 'fs-extra'
import { parseManifest } from './files-parseManifest'
import {
  contentCss,
  contentJs,
  devtoolsHtml,
  icon128,
  icon16,
  icon48,
  localesEnJson,
  localesEsJson,
  manifestJson,
  optionsHtml,
  popupHtml,
  serviceWorkerJs,
  srcDir,
} from '$test/helpers/mv3-kitchen-sink-paths'

const manifest = readJSONSync(manifestJson)

test('gets correct scripts', () => {
  const result = parseManifest(manifest, srcDir)

  expect(result.CONTENT).toEqual([contentJs])
  expect(result.BACKGROUND).toEqual([serviceWorkerJs])

  expect(result.SCRIPT).toEqual([])
})

test('gets correct html', () => {
  const result = parseManifest(manifest, srcDir)

  expect(result.HTML).toContain(optionsHtml)
  expect(result.HTML).toContain(popupHtml)
  expect(result.HTML).toContain(devtoolsHtml)
})

test('gets correct css', () => {
  const result = parseManifest(manifest, srcDir)

  expect(result.CSS).toContain(contentCss)
})

test('gets correct action icon', () => {
  const result = parseManifest(manifest, srcDir)

  expect(result.IMAGE).toContain(icon16)
})

test('gets correct action img', () => {
  const result = parseManifest(manifest, srcDir)

  expect(result.IMAGE).toContain(icon16)
  expect(result.IMAGE).toContain(icon48)
  expect(result.IMAGE).toContain(icon128)
})

test('gets correct locales folder', () => {
  const result = parseManifest(manifest, srcDir)

  expect(result.RAW).toContain(localesEnJson)
  expect(result.RAW).toContain(localesEsJson)
})
