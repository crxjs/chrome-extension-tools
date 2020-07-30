import { chrome } from 'jest-chrome'
import { defer } from './defer'

jest.mock('./placeholders')
// Use a virtual module for the dynamic import
jest.mock('import/path', () => {}, { virtual: true })
jest.useFakeTimers()

Object.assign(global, { chrome })

require('./importWrapper--implicit')

test('handles async messages', async () => {
  const deferred = defer()

  const response1 = 'test response 1'
  const response2 = 'test response 2'

  const listener1 = jest.fn((message, sender, sendResponse) => {
    sendResponse(response1)
    deferred.resolve()
  })
  const listener2 = jest.fn((message, sender, sendResponse) => {
    sendResponse(response2)
    deferred.resolve()
  })

  chrome.runtime.onMessage.addListener(listener1)
  chrome.runtime.onMessage.addListener(listener2)

  const sendResponse = jest.fn()
  const message = { greeting: 'test message 1' }

  const [listenerWrapper] = [...chrome.runtime.onMessage.getListeners()]

  // Should return true if it receives third argument
  const isAsyncMessage = listenerWrapper(message, {}, sendResponse)
  expect(isAsyncMessage).toBe(true)

  // Still in capture phase, so listeners should not be called
  expect(listener1).not.toBeCalled()
  expect(listener2).not.toBeCalled()
  expect(sendResponse).not.toBeCalled()

  // This will end the capture phase
  jest.runAllTimers()

  // Listeners have been called
  await deferred

  expect(listener1).toBeCalledWith(message, {}, sendResponse)
  expect(listener2).toBeCalledWith(message, {}, sendResponse)

  expect(sendResponse).toBeCalledTimes(3)
  expect(sendResponse).toBeCalledWith(response1)
  expect(sendResponse).toBeCalledWith(response2)
  expect(sendResponse).toBeCalledWith()

  // After capture is over, listeners determine return value
  const isAsyncMessage2 = listenerWrapper(message, {}, sendResponse)
  expect(isAsyncMessage2).toBe(false)

  listener1.mockImplementationOnce(() => true)
  const isAsyncMessage3 = listenerWrapper(message, {}, sendResponse)
  expect(isAsyncMessage3).toBe(true)
})
