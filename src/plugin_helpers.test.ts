import {
  categorizePlugins,
  combinePlugins,
  isRPCE,
} from './plugin_helpers'

const aliasA = { name: 'alias' }
const crxA1 = { name: 'crxA1', crx: true, enforce: 'pre' }
const pluginA2 = { name: 'pluginA2', enforce: 'pre' }
const rpceA = { name: 'chrome-extension' }
const crxA3 = { name: 'crxA3', crx: true }
const pluginA4 = { name: 'pluginA4' }
const crxA5 = { name: 'crxA5', crx: true, enforce: 'post' }
const pluginA6 = { name: 'pluginA6', enforce: 'post' }
const aliasB = { name: 'alias' }
const crxB1 = { name: 'crxB1', crx: true, enforce: 'pre' }
const pluginB2 = { name: 'pluginB2', enforce: 'pre' }
const rpceB = { name: 'chrome-extension' }
const crxB3 = { name: 'crxB3', crx: true }
const pluginB4 = { name: 'pluginB4', enforce: 'post' }
const crxB5 = { name: 'crxB5', crx: true, enforce: 'post' }
const pluginB6 = { name: 'pluginB6', enforce: 'post' }

const crxPlugins = [
  aliasA,
  crxA1,
  pluginA2,
  rpceA,
  crxA3,
  pluginA4,
  crxA5,
  pluginA6,
]
const basePlugins = [
  aliasB,
  crxB1,
  pluginB2,
  rpceB,
  crxB3,
  pluginB4,
  crxB5,
  pluginB6,
]

describe('categorizePlugins', () => {
  test('small array', () => {
    const result = categorizePlugins(crxPlugins)

    expect(result.basePlugins).toEqual([
      aliasA,
      pluginA2,
      rpceA,
      pluginA4,
      pluginA6,
    ])
    expect(result.prePlugins).toEqual([crxA1])
    expect(result.normalPlugins).toEqual([crxA3])
    expect(result.postPlugins).toEqual([crxA5])
  })

  test('large array', () => {
    const large = crxPlugins.concat(
      basePlugins.filter((p) => !isRPCE(p)),
    )
    const result = categorizePlugins(large)

    // this is not the order Vite would provide, but that is not our concern
    expect(result.basePlugins).toEqual([
      aliasA,
      pluginA2,
      rpceA,
      pluginA4,
      pluginA6,
      aliasB,
      pluginB2,
      pluginB4,
      pluginB6,
    ])
    expect(result.prePlugins).toEqual([crxA1, crxB1])
    expect(result.normalPlugins).toEqual([crxA3, crxB3])
    expect(result.postPlugins).toEqual([crxA5, crxB5])
  })
})

/**
 * Constraints for `combinePlugins`:
 * 1. Result should include RPCE from `crxPlugins`, if present
 *    - If RPCE is not present in `crxPlugins`, include RPCE from `basePlugins`
 * 2. Result must include only crx plugins from `crxPlugins`
 * 3. Result must include only non-crx plugins from `basePlugins`
 * 4. Result should maintain non-crx plugin order from `basePlugins`
 * 5. RPCE in result should be in same relative position as RPCE in `basePlugins`
 * 6. RPCE is required in `basePlugins`
 */
describe('combinePlugins', () => {
  test('simple combination', () => {
    const result = combinePlugins(basePlugins, crxPlugins)

    const expected = [
      aliasB,
      crxA1,
      crxB1,
      pluginB2,
      rpceB,
      crxA3,
      crxB3,
      pluginB4,
      crxB5,
      pluginB6,
      crxA5,
    ]

    expect(result.length).toBe(expected.length)
    expect(result).toEqual(expected)
  })

  test.todo('unequal plugin count')

  test('rpce missing from crx plugins', () => {
    const result = combinePlugins(
      basePlugins,
      crxPlugins.filter((p) => !isRPCE(p)),
    )

    const expected = [
      aliasB,
      crxA1,
      crxB1,
      pluginB2,
      rpceB,
      crxA3,
      crxB3,
      pluginB4,
      crxB5,
      pluginB6,
      crxA5,
    ]

    expect(result.length).toBe(expected.length)
    expect(result).toEqual(expected)
  })

  test('rpce missing from base plugins', () => {
    expect(() =>
      combinePlugins(
        basePlugins.filter((p) => !isRPCE(p)),
        crxPlugins,
      ),
    ).toThrow()
  })
})
