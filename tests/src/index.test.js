// import { watchAsync } from '../../src/index'
// import replace from 'replace-in-file'
// import git from 'simple-git/promise'
import { rollup } from 'rollup'
import config from '../fixtures/basic/rollup.config'
import { getScriptTags } from '../../src/script-tags'

describe('rollup', () => {
  test.only('bundles two chunks', async () => {
    const bundle = await rollup(config)
    const { output } = await bundle.generate(config.output)

    expect(output.length).toBe(3)
  })
})

describe('getScriptTags', () => {
  test('works', () => {
    const htmlDirName = 'tests/fixtures/basic/'
    const scriptTags = getScriptTags(htmlDirName)
    const result = scriptTags([], 'popup.html')

    expect(result).toContain('popup.js')
  })
})

// describe.skip('watch', () => {
//   const spy = jest.fn()
//   let watcher

//   afterEach(async () => {
//     watcher.close()
//     jest.clearAllMocks()

//     return git().checkout(['HEAD', 'tests/fixtures/basic'])
//   })

//   test('does not crash', async () => {
//     watcher = watchAsync(config, spy)

//     await watcher.next('END')

//     expect(spy).toBeCalledTimes(4)
//   })

//   test('updates file change', async () => {
//     watcher = watchAsync(config, spy)

//     await watcher.next('END')

//     expect(spy).toBeCalledTimes(4)

//     await replace({
//       files: 'tests/fixtures/basic/entry.js',
//       from: 'add',
//       to: 'subtract',
//     })

//     await watcher.next('END')

//     expect(spy).toBeCalledTimes(8)
//   })
// })
