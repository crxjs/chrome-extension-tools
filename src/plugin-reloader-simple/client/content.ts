/* eslint-env browser */
/* globals chrome */

// eslint-disable-next-line quotes
import { loadMessage } from './load-message'

// Log load message to browser dev console
console.log(loadMessage)

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
