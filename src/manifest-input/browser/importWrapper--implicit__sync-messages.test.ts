import { chrome } from 'jest-chrome'
import { defer } from './defer'

jest.mock('./placeholders')
// Use a virtual module for the dynamic import
jest.mock('import/path', () => {}, { virtual: true })
jest.useFakeTimers()

Object.assign(global, { chrome })

require('./importWrapper--implicit')

test('listener returns false for normal callbacks', async () => {
  const deferred = defer()

  const message = { greeting: 'test message' }
  const sendResponse = jest.fn()
  const response = 'test response'

  const listener = jest.fn(() => {
    sendResponse(response)
    deferred.resolve()
  })

  chrome.runtime.onMessage.addListener(listener)

  const [listenerWrapper] = [...chrome.runtime.onMessage.getListeners()]

  // Should return true if it receives third argument
  const isAsyncMessage1 = listenerWrapper(message, {}, sendResponse)
  expect(isAsyncMessage1).toBe(true)

  // Still in capture phase, so listeners should not be called
  expect(listener).not.toBeCalled()
  expect(sendResponse).not.toBeCalled()

  // This will end the capture phase
  jest.runAllTimers()

  // Listeners have been called
  await deferred

  expect(listener).toBeCalledWith(message, {}, sendResponse)
  expect(sendResponse).toBeCalledWith(response)

  // After capture is over, listeners determine return value
  const isAsyncMessage2 = listenerWrapper(message, {}, sendResponse)
  expect(isAsyncMessage2).toBe(false)
})
