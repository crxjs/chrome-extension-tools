import { getMatchPatternOrigin } from './helpers'
import { test, expect } from 'vitest'

test.each([
  ['*://*/*foo.json*', '*://*/*'],
  ['*://google.*', '*://google.*'],
  ['http://*.google.com/search', 'http://*.google.com/*'],
  ['http://b.com', 'http://b.com'],
  ['https://a.com/*', 'https://a.com/*'],
  ['https://a.com/subpath/* ', 'https://a.com/*'],
  ['https://example.com/', 'https://example.com/*'],
  ['<all_urls>', '<all_urls>'],
])('$pattern -> $expected', (pattern, expected) => {
  const result = getMatchPatternOrigin(pattern)
  expect(result).toBe(expected)
})

test('sorting mystery', () => {
  const inputs = ['https://a.com/*', 'http://b.com/*']
  const outputs = inputs.map(getMatchPatternOrigin)

  expect(inputs).toEqual(outputs)
  expect(inputs.sort()).toEqual(outputs.sort())
})
