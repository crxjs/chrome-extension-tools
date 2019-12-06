import { OutputBundle, OutputChunk } from 'rollup'
import { context } from '../../../__fixtures__/plugin-context'
import { isChunk } from '../../helpers'
import { validateNames } from '../index'

const bundle: OutputBundle = require('../../../__fixtures__/validate-names__sample-bundle.json')

const helperKey = Object.keys(bundle).find((name) =>
  name.includes('_'),
)!

const helperName = helperKey.split('-')[0]

const fixedKey = helperKey.slice(1)
const fixedName = helperName.slice(1)

const plugin = validateNames()

test('renames chunks by mutating the bundle', () => {
  const helperChunk = bundle[helperKey] as OutputChunk

  expect(helperChunk).toBeDefined()

  {
    const { facadeModuleId, fileName, name } = helperChunk

    /* ------------------ PRE MUTATION ----------------- */
    expect(fileName).toMatch(helperKey)
    expect(name).toMatch(helperName)

    expect(facadeModuleId!).toBeNull()
  }

  plugin.generateBundle.call(context, {}, bundle, false)

  expect(bundle[helperKey]).toBeUndefined()

  expect(bundle[fixedKey]).toBeDefined()
  expect(bundle[fixedKey]).toBe(helperChunk)

  {
    const { facadeModuleId, fileName, name } = helperChunk

    /* ----------------- POST MUTATION ----------------- */
    expect(fileName).not.toMatch(helperKey)
    expect(name).not.toMatch(helperKey)

    expect(fileName).toMatch(fixedKey)
    expect(name).toMatch(fixedName)

    expect(facadeModuleId!).toBeNull()
  }

  const chunks = Object.values(bundle).filter(isChunk)

  const dynamicImports = chunks.flatMap(
    ({ dynamicImports: d }) => d,
  )
  const exports = chunks.flatMap(({ exports: e }) => e)

  expect(dynamicImports).not.toContain(helperKey)
  expect(exports).not.toContain(helperKey)
})
