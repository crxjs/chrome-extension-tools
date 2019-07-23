import { rollup } from 'rollup'
import config from './rollup.config'

test.todo('does not add bg imports to web_accessible_resources')

test('adds content script dynamic imports to web_accessible_resources', async () => {
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

  const contentScript = output.find(({ fileName }) =>
    fileName.endsWith('content.js'),
  )

  expect(contentScript).toBeDefined()
  expect(contentScript.name).toBe('content')
  expect(contentScript.code).toMatch(
    /web-accessible-resources\/\${content}\.js/,
  )

  const dynamicImport = output.find(({ fileName }) =>
    contentScript.dynamicImports.includes(fileName),
  )

  expect(dynamicImport.name).toBe('dynamic')
  expect(dynamicImport.code).toMatch(
    /'web-accessible-resources\/dynamic\.js'/,
  )

  const { web_accessible_resources: war = [] } = manifest

  expect(war).toContain(dynamicImport.fileName)
})

test('adds content script imports to web_accessible_resources', async () => {
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

  const contentScript = output.find(({ fileName }) =>
    fileName.endsWith('content.js'),
  )

  expect(contentScript).toBeDefined()
  expect(contentScript.name).toBe('content')
  expect(contentScript.code).toMatch(
    /`web-accessible-resources\/\${content}\.js`/,
  )

  const contentScriptImport = output.find(({ fileName }) =>
    contentScript.imports.includes(fileName),
  )

  expect(contentScriptImport.name).toBe('ct')
  expect(contentScriptImport.code).toMatch(
    /const content = 'content'/,
  )

  const { web_accessible_resources: war = [] } = manifest

  expect(war).toContain(contentScriptImport.fileName)
})
