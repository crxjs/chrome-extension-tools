import { describe, test, expect } from 'vitest'
import { extractScriptsAndRemove } from './html'

describe('extractScriptsAndRemove', () => {
  const sampleHtml = `<!DOCTYPE html>
<html>
<head>
  <title>Test</title>
  <script type="module" src="/src/main.ts"></script>
</head>
<body>
  <div id="app"></div>
  <script src="/other.js"></script>
  <script>console.log('inline')</script>
</body>
</html>`

  test('extracts src attributes from all script tags', () => {
    const { scriptSrcs } = extractScriptsAndRemove(sampleHtml)

    expect(scriptSrcs).toHaveLength(3)
    expect(scriptSrcs[0]).toBe('/src/main.ts')
    expect(scriptSrcs[1]).toBe('/other.js')
    expect(scriptSrcs[2]).toBeUndefined() // inline script has no src
  })

  test('removes all script tags from html', () => {
    const { html } = extractScriptsAndRemove(sampleHtml)

    expect(html).not.toContain('<script')
    expect(html).not.toContain('</script>')
  })

  test('preserves non-script content', () => {
    const { html } = extractScriptsAndRemove(sampleHtml)

    expect(html).toContain('<title>Test</title>')
    expect(html).toContain('<div id="app"></div>')
    expect(html).toContain('<!DOCTYPE html>')
  })

  test('handles html without scripts', () => {
    const noScriptHtml = `<!DOCTYPE html>
<html>
<head><title>No Scripts</title></head>
<body><p>Hello</p></body>
</html>`

    const { scriptSrcs, html } = extractScriptsAndRemove(noScriptHtml)

    expect(scriptSrcs).toHaveLength(0)
    expect(html).toContain('<p>Hello</p>')
  })
})
