// import { watchAsync } from '../../src/index'
// import replace from 'replace-in-file'
// import git from 'simple-git/promise'
import { rollup } from 'rollup'
import config from '../fixtures/basic/rollup.config'
import {
  loadHtml,
  getCssLinks,
  getScriptTags,
} from '../../src/cheerio'

describe('rollup', () => {
  test.skip('bundles two chunks', async () => {
    const bundle = await rollup(config)
    const { output } = await bundle.generate(config.output)

    expect(output.length).toBe(3)
  })
})

describe('loadHtml', () => {
  test('cheerio!', () => {
    const htmlDirName = 'tests/fixtures/basic/'
    const partial = loadHtml(htmlDirName)
    const result = partial('popup.html')

    expect(result('link').length).toBe(1)
  })
})

describe('getScriptTags', () => {
  test('works', () => {
    const htmlDir = 'tests/fixtures/basic/'
    const name = 'popup.html'
    const cheerio = loadHtml(htmlDir)(name)
    const result = getScriptTags(cheerio)

    expect(result).toContain('popup.js')
  })
})

describe('getCssLinks', () => {
  test('works', () => {
    const htmlDir = 'tests/fixtures/basic/'
    const name = 'popup.html'
    const cheerio = loadHtml(htmlDir)(name)
    const result = getCssLinks(cheerio)

    expect(result).toContain('popup.css')
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
