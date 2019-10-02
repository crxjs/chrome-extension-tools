import manifest from './sample_manifests/manifest-all.json'
import { deriveEntries } from '../../../src/manifest-input/manifest-parser/entries'

const predObj = {
  js: s => /\.js$/.test(s),
  css: s => /\.css$/.test(s),
  html: s => /\.html$/.test(s),
  img: s => /\.png$/.test(s),
  filter: v =>
    typeof v === 'string' &&
    v.includes('.') &&
    !v.includes('*') &&
    !/^https?:/.test(v),
}

const result = deriveEntries(manifest, predObj)

test('returns correct api', () => {
  expect(result.js).toBeDefined()
  expect(result.js).toBeInstanceOf(Array)
  expect(result.css).toBeDefined()
  expect(result.css).toBeInstanceOf(Array)
  expect(result.html).toBeDefined()
  expect(result.html).toBeInstanceOf(Array)
  expect(result.img).toBeDefined()
  expect(result.img).toBeInstanceOf(Array)
})

test('gets all js', () => {
  expect(result.js).toContain('background/chrome.message.bg.js')
  expect(result.js).toContain('background/init.bg.js')
  expect(result.js).toContain('content/state.ct.js')
  expect(result.js).toContain('utils/web.interval.js')
  expect(result.js.length).toBe(4)
})

test('gets all css', () => {
  expect(result.css).toContain('content/styles.ct.css')
})

test('gets all html', () => {
  expect(result.html).toContain('options/options.html')
})

test('gets all images', () => {
  expect(result.img).toContain('icon-16.png')
  expect(result.img).toContain('icon-48.png')
  expect(result.img).toContain('icon-128.png')
  expect(result.img.length).toBe(3)
})
