import { delay } from './delay'
import { captureEvents } from './captureEvents'

const events = Object.entries(chrome)
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
      ...Object.entries(space).filter(([name, { addListener }]) => {
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
      }),
    ]
  }, [] as any[])

const triggerEvents = captureEvents(events)

import('%PATH%')
  .then(delay('%DELAY%'))
  .then(triggerEvents)
