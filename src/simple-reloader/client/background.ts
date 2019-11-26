/* eslint-env browser */
/* globals chrome */

import { loadMessage, timestampPath } from './load-message'

// Log load message to browser dev console
console.log(loadMessage)

let timestamp: string | undefined

const id = setInterval(() => {
  fetch(timestampPath)
    .then(({ body }) => {
      if (!body) throw new Error('Unable to fetch timestamp')

      const reader = body.getReader()

      return reader.read()
    })
    .then(({ value }) => {
      return new TextDecoder('utf-8').decode(value)
    })
    .then((t) => {
      if (!timestamp) {
        timestamp = t
      } else if (timestamp !== t) {
        chrome.runtime.reload()
      }
    })
    .catch((error) => {
      clearInterval(id)

      const errors = localStorage.chromeExtensionReloader || 0

      // Should reload at least once if fetch fails
      // - if fetch fails, the timestamp file is absent,
      //   so the extension code will be different
      if (errors < 5) {
        localStorage.chromeExtensionReloader = errors + 1

        chrome.runtime.reload()
      } else {
        console.log('AUTO-RELOADER ERROR:')
        console.error(error)
      }
    })
}, 1000)
