import { readJSONSync } from 'fs-extra'
import { parseManifest } from './files_parseManifest'
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
  missaaliOtf,
  notoSansBlack,
  notoSansLight,
  optionsHtml,
  popupHtml,
  serviceWorkerJs,
  srcDir,
} from '$test/helpers/mv3-kitchen-sink-paths'
import { join } from 'path'

const manifest = readJSONSync(join(srcDir, manifestJson))

test('gets correct scripts', () => {
  const result = parseManifest(manifest)

  expect(result.CONTENT).toEqual([contentJs])
  expect(result.BACKGROUND).toEqual([serviceWorkerJs])

  expect(result.MODULE).toEqual([])
})

test('gets correct html', () => {
  const result = parseManifest(manifest)

  expect(result.HTML).toContain(optionsHtml)
  expect(result.HTML).toContain(popupHtml)
  expect(result.HTML).toContain(devtoolsHtml)
})

test('gets correct css', () => {
  const result = parseManifest(manifest)

  expect(result.CSS).toContain(contentCss)
})

test('gets correct action icon', () => {
  const result = parseManifest(manifest)

  expect(result.IMAGE).toContain(icon16)
})

test('gets correct action img', () => {
  const result = parseManifest(manifest)

  expect(result.IMAGE).toContain(icon16)
  expect(result.IMAGE).toContain(icon48)
  expect(result.IMAGE).toContain(icon128)
})

test('gets correct locales folder', () => {
  const result = parseManifest(manifest)

  expect(result.JSON).toContain(localesEnJson)
  expect(result.JSON).toContain(localesEsJson)
})

test('gets correct raw files', () => {
  const result = parseManifest(manifest)

  expect(result.RAW).toContain(notoSansLight)
  expect(result.RAW).toContain(notoSansBlack)
  expect(result.RAW).toContain(missaaliOtf)
})
