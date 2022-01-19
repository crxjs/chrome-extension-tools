import {
  backgroundJs,
  contentCss,
  contentJs,
  devtoolsHtml,
  icon128,
  icon16,
  icon48,
  manifestJson,
  optionsHtml,
  popupHtml,
  srcDir,
} from '$test/helpers/mv2-kitchen-sink-paths'
import { readJSONSync } from 'fs-extra'
import { join } from 'path'
import { parseManifest } from './files_parseManifest'

const manifest = readJSONSync(join(srcDir, manifestJson))

test('gets correct scripts', () => {
  const result = parseManifest(manifest)

  expect(result.CONTENT).toEqual([contentJs])
  expect(result.BACKGROUND).toEqual([backgroundJs])
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

test('gets match pattern for locales folders', () => {
  const result = parseManifest(manifest)

  expect(result.JSON).toEqual(['_locales/**/messages.json'])
})
