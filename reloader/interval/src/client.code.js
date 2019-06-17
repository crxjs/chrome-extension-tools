/* eslint-env browser */
/* globals chrome */

// eslint-disable-next-line quotes
const loadMessage = `%LOAD_MESSAGE%`

// Log load message to browser dev console
console.log(loadMessage)

let timestamp

const id = setInterval(() => {
  fetch('%TIMESTAMP_PATH%')
    .then(({ body }) => {
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
