import { ChromeEvent, LastError } from './types'

export function captureEvents(events: ChromeEvent[]) {
  const captured = events.map(captureEvent)

  return () => captured.forEach((t) => t())

  function captureEvent(event: ChromeEvent) {
    let capture = true

    const callbacks = new Map<Function, any[]>()
    const events = new Set<any[]>()

    event.addListener(handleEvent)

    function handleEvent(...args: any[]) {
      const error = chrome.runtime.lastError

      if (capture) {
        events.add([error, ...args])
      } else {
        callListeners(error, ...args)
      }
    }

    event.addListener = function addListener(cb: any, ...options) {
      callbacks.set(cb, options)
    }

    event.hasListeners = function hasListeners() {
      return callbacks.size > 0
    }

    event.hasListener = function hasListener(cb) {
      return callbacks.has(cb)
    }

    event.removeListener = function removeListener(cb) {
      callbacks.delete(cb)
    }

    event.__isCapturedEvent = true

    function callListeners(error?: LastError, ...args: any[]) {
      callbacks.forEach((options, cb) => {
        if (error) chrome.runtime.lastError = error
        cb(...args)
        if (error) delete chrome.runtime.lastError
      })
    }

    return () => {
      events.forEach((args) => {
        callListeners(...args)
      })

      capture = false
      events.clear()
    }
  }
}
