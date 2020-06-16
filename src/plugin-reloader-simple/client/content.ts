/* eslint-env browser */
/* globals chrome */

import { loadMessagePlaceholder } from '../CONSTANTS'

// Log load message to browser dev console
console.log(loadMessagePlaceholder)

const { name } = chrome.runtime.getManifest()

const reload = () => {
  console.log(`${name} has reloaded...`)

  setTimeout(() => {
    location.reload()
  }, 500)
}

setInterval(() => {
  try {
    chrome.runtime.getManifest()
  } catch (error) {
    if (error.message === 'Extension context invalidated.') {
      reload()
    }
  }
}, 1000)
