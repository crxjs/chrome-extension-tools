/* eslint-env browser */
/* globals chrome */

console.log(
  `
DEVELOPMENT build with persistent auto-reloader.
Loaded on ${new Date().toTimeString()}.
`.trim(),
)

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
      console.error(error)
      clearInterval(id)
    })
}, 1000)
