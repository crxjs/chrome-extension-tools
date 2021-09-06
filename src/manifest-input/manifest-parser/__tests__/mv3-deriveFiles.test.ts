import { readJSONSync } from 'fs-extra'
import { deriveFiles } from '..'
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
  const result = deriveFiles(manifest, srcDir)

  expect(result.contentScripts).toEqual([contentJs])
  expect(result.background).toEqual([serviceWorkerJs])

  expect(result.js).toEqual([])
})

test('gets correct html', () => {
  const result = deriveFiles(manifest, srcDir)

  expect(result.html).toContain(optionsHtml)
  expect(result.html).toContain(popupHtml)
  expect(result.html).toContain(devtoolsHtml)
})

test('gets correct css', () => {
  const result = deriveFiles(manifest, srcDir)

  expect(result.css).toContain(contentCss)
})

test('gets correct action icon', () => {
  const result = deriveFiles(manifest, srcDir)

  expect(result.img).toContain(icon16)
})

test('gets correct action img', () => {
  const result = deriveFiles(manifest, srcDir)

  expect(result.img).toContain(icon16)
  expect(result.img).toContain(icon48)
  expect(result.img).toContain(icon128)
})

test('gets correct locales folder', () => {
  const result = deriveFiles(manifest, srcDir)

  expect(result.others).toContain(localesEnJson)
  expect(result.others).toContain(localesEsJson)
})
