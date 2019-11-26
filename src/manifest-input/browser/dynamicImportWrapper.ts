type ChromeEvent = chrome.events.Event<Function>
type LastError = chrome.runtime.LastError | undefined

const triggerEvents = captureEvents()

import('%PATH%')
  .then(delay('%DELAY%'))
  .then(triggerEvents)

function captureEvents() {
  const triggers = Object.entries(chrome)
    .filter(([name]) => {
      switch (name) {
        // Not compatible with event pages
        case 'webRequest':
          return false

        case '%NAME%':
          return true

        default:
          return false
      }
    })
    .reduce((r, [, space]) => {
      return [
        ...r,
        ...Object.entries(space)
          .filter(([name, { addListener }]) => {
            // Include only events
            if (!addListener) {
              return false
            }

            switch (name) {
              case '%EVENT%':
                return true

              default:
                return false
            }
          })
          // Capture Events
          .map(captureEvent),
      ]
    }, [] as any[])

  return () =>
    triggers.forEach((t) => {
      return t()
    })

  function captureEvent([name, event]: [string, ChromeEvent]) {
    let capture = true

    const callbacks = new Map<Function, any[]>()
    const events = new Set<any[]>()

    event.addListener(handleEvent)

    function handleEvent() {
      // console.time(name)
      const error = chrome.runtime.lastError

      if (capture) {
        // console.log('delay', name)
        events.add([error, ...arguments])
      } else {
        // console.log('direct', name)
        callListeners(error, ...arguments)
      }
    }

    event.addListener = function addListener(
      cb: any,
      ...options
    ) {
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

    function callListeners(error?: LastError, ...args: any[]) {
      // console.timeEnd(name)
      callbacks.forEach((options, cb) => {
        chrome.runtime.lastError = error
        cb(...args)
        delete chrome.runtime.lastError
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

function delay(ms: any) {
  return (x: any) =>
    new Promise((resolve) => {
      setTimeout(resolve, ms, x)
    })
}
