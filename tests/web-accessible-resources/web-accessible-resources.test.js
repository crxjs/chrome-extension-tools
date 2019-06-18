import { rollup } from 'rollup'
import config from './rollup.config'

// REASON: dynamic imports in content scripts require web_accessible_resources

test('wraps content script in dynamic import', async () => {
  const bundle = await rollup(config)
  const { output } = await bundle.generate(config.output)

  const manifestAsset = output.find(
    ({ fileName }) => fileName === 'manifest.json',
  )

  expect(manifestAsset).toBeDefined()
  expect(typeof manifestAsset.source).toBe('string')

  const manifest = JSON.parse(manifestAsset.source)

  const { content_scripts: contentScripts = [] } = manifest

  expect(contentScripts.length).toBe(1)

  const contentScriptNames = contentScripts.reduce(
    (r, { js }) => r.concat(js),
    [],
  )

  expect(contentScriptNames.length).toBe(1)

  const contentScript = output.find(({ fileName }) =>
    contentScriptNames.includes(fileName),
  )

  expect(contentScript.name).toBe('content')
  expect(contentScript.code).toMatch(
    /web-accessible-resources\/content\.js/,
  )

  const dynamicImport = output.find(({ fileName }) =>
    contentScript.dynamicImports.includes(fileName),
  )

  expect(dynamicImport.name).toBe('dynamic')
  expect(dynamicImport.code).toMatch(
    /web-accessible-resources\/dynamic\.js/,
  )

  const { web_accessible_resources: war = [] } = manifest

  expect(war).toContain(dynamicImport.fileName)
})
