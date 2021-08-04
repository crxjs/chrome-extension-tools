import { chrome } from 'jest-chrome'
import { defer } from './defer'
Object.assign(global, { chrome })

jest.mock('./placeholders')
jest.mock('import/path', () => {}, { virtual: true })
jest.useFakeTimers()

require('./importWrapper--explicit')

test('delays events before delay resolves', async () => {
  const deferred = defer()
  const listener = jest.fn(() => deferred.resolve())
  const details: chrome.runtime.InstalledDetails = {
    reason: 'install',
  }

  chrome.runtime.onInstalled.addListener(listener)
  chrome.runtime.onInstalled.callListeners(details)

  expect(listener).not.toBeCalled()

  jest.advanceTimersToNextTimer()

  await deferred

  expect(listener).toBeCalled()
})

test('captures explicit events', () => {
  // @ts-expect-error We known what we're doing here
  expect(chrome.runtime.onMessage.__isCapturedEvent).toBe(true)
  // @ts-expect-error We known what we're doing here
  expect(chrome.runtime.onInstalled.__isCapturedEvent).toBe(true)
})
