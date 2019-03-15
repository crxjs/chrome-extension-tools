import { watchAsync } from '@bumble/rollup-watch-async'
import replace from 'replace-in-file'
import git from 'simple-git/promise'
import path from 'path'
import { rollup } from 'rollup'
import config from '../fixtures/basic/rollup.config'
import {
  loadHtml,
  getCssLinks,
  getScriptTags,
} from '../../src/cheerio'

describe('rollup', () => {
  test('bundles chunks and assets', async () => {
    const bundle = await rollup(config)
    const { output } = await bundle.generate(config.output)

    expect(output.length).toBe(6)
  })
})

describe('loadHtml', () => {
  test('cheerio!', () => {
    const htmlDir = 'tests/fixtures/basic/'
    const name = 'popup.html'
    const filePath = path.join(htmlDir, name)
    const result = loadHtml(filePath)

    expect(result('link').length).toBe(1)
  })
})

describe('getScriptTags', () => {
  test('works', () => {
    const htmlDir = 'tests/fixtures/basic/'
    const name = 'popup.html'
    const filePath = path.join(htmlDir, name)
    const cheerio = loadHtml(filePath)
    const result = getScriptTags(cheerio)

    expect(result).toContain('popup.js')
  })
})

describe('getCssLinks', () => {
  test('works', () => {
    const htmlDir = 'tests/fixtures/basic/'
    const name = 'popup.html'
    const filePath = path.join(htmlDir, name)
    const cheerio = loadHtml(filePath)
    const result = getCssLinks(cheerio)

    expect(result).toContain('popup.css')
  })
})

describe('watch', () => {
  const spy = jest.fn()
  let watcher

  afterEach(async () => {
    watcher.close()

    return git().checkout(['HEAD', 'tests/fixtures/basic'])
  })

  test('does not crash', async () => {
    watcher = watchAsync(config, spy)

    await watcher.next('END')

    expect(spy).toBeCalledTimes(4)
  })

  test('updates file change', async () => {
    watcher = watchAsync(config, spy)

    await watcher.next('END')

    expect(spy).toBeCalledTimes(4)

    await replace({
      files: 'tests/fixtures/basic/background.js',
      from: 'background',
      to: 'something else',
    })

    await watcher.next('END')

    expect(spy).toBeCalledTimes(8)
  })
})
