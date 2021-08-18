/* eslint-env browser */
/* globals chrome */

import { loadMessagePlaceholder } from '../CONSTANTS'

// Log load message to browser dev console
console.log(loadMessagePlaceholder.slice(1, -1))

const { name } = chrome.runtime.getManifest()

connect()

function connect() {
  console.count('connect')

  const port = chrome.runtime.connect({ name: 'simpleReloader' })
  port.onDisconnect.addListener(() => {
    console.count('onDisconnect')
    connect()
  })
  port.onMessage.addListener(({ type }) => {
    if (type === 'reload') reload()
  })

  setTimeout(() => {
    try {
      chrome.runtime.getManifest()
    } catch (error) {
      reload()
    }
  }, 500)

  setTimeout(() => {
    console.count('disconnect')
    port.disconnect()
    connect()
  }, 5 * 59 * 1000)
}

function reload() {
  console.log(`${name} has reloaded...`)

  setTimeout(() => {
    location.reload()
  }, 500)
}
