/* eslint-env browser */
/* globals chrome */

import { loadMessagePlaceholder } from '../CONSTANTS'

const delay = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(() => resolve(), ms))

// Log load message to browser dev console
console.log(loadMessagePlaceholder.slice(1, -1))

const { name } = chrome.runtime.getManifest()

connect()
  .then(reload)
  .catch(console.error)

async function reload(): Promise<void> {
  console.log(`${name} has reloaded...`)

  await delay(500)

  return location.reload()
}

async function connect(): Promise<void> {
  // If the background was reloaded manually,
  //  need to delay for context invalidation
  await delay(100)

  let port: chrome.runtime.Port
  try {
    // This will throw if bg was reloaded manually
    port = chrome.runtime.connect({
      name: 'simpleReloader',
    })
  } catch (error) {
    return // should reload, context invalid
  }

  const shouldReload = await Promise.race([
    // get a new port every 5 minutes
    delay(5 * 59 * 1000).then(() => false),
    // or if the background disconnects
    new Promise<chrome.runtime.Port>((r) =>
      port.onDisconnect.addListener(r),
    ).then(() => false),
    // unless we get a reload message
    new Promise<{ type: string }>((r) =>
      port.onMessage.addListener(r),
    ).then(({ type }) => type === 'reload'),
  ])

  // Clean up old port
  port.disconnect()

  if (shouldReload) return

  return connect()
}
