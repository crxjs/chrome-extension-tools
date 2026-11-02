import { describe, test, expect } from 'vitest'
import { extractScriptsAndRemove, rewriteDevHtmlAssets } from './html'

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

test('Firefox dev HTML loads assets from Vite while retaining extension navigation', () => {
  const html = rewriteDevHtmlAssets(
    '<script src="/src/main.ts"></script><img src="./logo.svg"><a href="options.html">Options</a><iframe src="frame.html"></iframe><img src="data:image/png;base64,abc">',
    'http://localhost:5200/src/popup.html',
  )
  expect(html).toContain('src="http://localhost:5200/src/main.ts"')
  expect(html).toContain('src="http://localhost:5200/src/logo.svg"')
  expect(html).toContain('href="options.html"')
  expect(html).toContain('src="frame.html"')
  expect(html).toContain('src="data:image/png;base64,abc"')
})
