const triggerEvents = captureEvents()

import('../background.js').then(triggerEvents)

function captureEvents() {
  const triggers = Object.entries(chrome)
    .filter(([name]) => {
      switch (name) {
        // Not compatible with event pages
        case 'webRequest':
          return false

        case 'runtime':
          return true

        case 'runtime':
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
              case 'onInstalled':
                return true
              case 'onMessage':
                return true

              default:
                return false
            }
          })
          // Capture Events
          .map(captureEvent),
      ]
    }, [])

  return () =>
    triggers.forEach((t) => {
      return t()
    })

  function captureEvent([name, event]) {
    let capture = true

    const callbacks = new Map()
    const events = new Set()

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

    event.addListener = function addListener(cb, ...options) {
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

    function callListeners(error, ...args) {
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

function delay(ms) {
  return (x) =>
    new Promise((resolve) => {
      setTimeout(resolve, ms, x)
    })
}
