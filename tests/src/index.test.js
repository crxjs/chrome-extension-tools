import { watchAsync } from '../../src/index'
import config from '../fixtures/basic/rollup.config'
import replace from 'replace-in-file'
import git from 'simple-git/promise'

describe('watchAsync', () => {
  const spy = jest.fn()
  let watcher

  afterEach(async () => {
    watcher.close()
    jest.clearAllMocks()

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
      files: 'tests/fixtures/basic/entry.js',
      from: 'add',
      to: 'subtract',
    })

    await watcher.next('END')

    expect(spy).toBeCalledTimes(8)
  })
})
