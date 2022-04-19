import { ChromeEvent } from './types'

export function captureEvents(events: ChromeEvent[]) {
  const captured = events.map(captureEvent)

  return () => captured.forEach((t) => t())

  function captureEvent(event: ChromeEvent) {
    let isCapturePhase = true

    // eslint-disable-next-line @typescript-eslint/ban-types
    const callbacks = new Map<Function, any[]>()
    const eventArgs = new Set<any[]>()

    // This is the only listener for the native event
    event.addListener(handleEvent)

    function handleEvent(...args: any[]): boolean {
      if (isCapturePhase) {
        // This is before dynamic import completes
        eventArgs.add(args)

        if (typeof args[2] === 'function') {
          // During capture phase all messages are async
          return true
        } else {
          // Sync messages or some other event
          return false
        }
      } else {
        // The callbacks determine the listener return value
        return callListeners(...args)
      }
    }

    // Called when dynamic import is complete
    //  and when subsequent events fire
    function callListeners(...args: any[]): boolean {
      let isAsyncCallback = false
      callbacks.forEach((options, cb) => {
        // A callback error should not affect the other callbacks
        try {
          isAsyncCallback = cb(...args) || isAsyncCallback
        } catch (error) {
          console.error(error)
        }
      })

      if (!isAsyncCallback && typeof args[2] === 'function') {
        // We made this an async message callback during capture phase
        //   when the function handleEvent returned true
        //   so we are responsible to call sendResponse
        // If the callbacks are sync message callbacks
        //   the sendMessage callback on the other side
        //   resolves with no arguments (this is the same behavior)
        args[2]()
      }

      // Support events after import is complete
      return isAsyncCallback
    }

    // This function will trigger this Event with our stored args
    function triggerEvents() {
      // Fire each event for this Event
      eventArgs.forEach((args) => {
        callListeners(...args)
      })

      // Dynamic import is complete
      isCapturePhase = false
      // Don't need these anymore
      eventArgs.clear()
    }

    // All future listeners are handled by our code
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

    return triggerEvents
  }
}
