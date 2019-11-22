import { deriveFiles } from '..'
import {
  backgroundJs,
  contentJs,
  manifestJson,
  srcDir,
  popupHtml,
  optionsHtml,
  contentCss,
  icon16,
  icon128,
  icon48,
} from '../../../../__fixtures__/basic-paths'

const manifest = require(manifestJson)

test('gets correct scripts', () => {
  const result = deriveFiles(manifest, srcDir)

  expect(result.js).toContain(backgroundJs)
  expect(result.js).toContain(contentJs)
})

test('gets correct html', () => {
  const result = deriveFiles(manifest, srcDir)

  expect(result.html).toContain(optionsHtml)
  expect(result.html).toContain(popupHtml)
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

test('does not emit duplicates', () => {
  const result = deriveFiles(manifest, srcDir)

  expect(result.js.length).toBe(2)
  expect(result.js).toContain(backgroundJs)
  expect(result.js).toContain(contentJs)
})
