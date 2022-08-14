import { stubMatchPattern } from './helpers'

test.each`
  pattern                          | expected
  ${'*://*/*foo.json*'}            | ${'*://*/*'}
  ${'*://google.*'}                | ${'*://google.*'}
  ${'http://*.google.com/search*'} | ${'http://*.google.com/*'}
  ${'http://b.com'}                | ${'http://b.com'}
  ${'https://a.com/*'}             | ${'https://a.com/*'}
  ${'https://a.com/subpath/* '}    | ${'https://a.com/*'}
  ${'<all_urls>'}                  | ${'<all_urls>'}
`(
  '$pattern -> $expected',
  ({ pattern, expected }: { pattern: string; expected: string }) => {
    const result = stubMatchPattern(pattern)
    expect(result).toBe(expected)
  },
)

test('sorting mystery', () => {
  const inputs = ['https://a.com/*', 'http://b.com/*']
  const outputs = inputs.map(stubMatchPattern)

  expect(inputs).toEqual(outputs)
  expect(inputs.sort()).toEqual(outputs.sort())
})
