/* eslint-env browser */
/* globals chrome */

import {
  ctScriptPathPlaceholder,
  loadMessagePlaceholder,
  timestampPathPlaceholder,
} from '../CONSTANTS'

// Log load message to browser dev console
console.log(loadMessagePlaceholder.slice(1, -1))

// Modify chrome.tabs.executeScript to inject reloader
const _executeScript = chrome.tabs.executeScript
chrome.tabs.executeScript = (...args: any): void => {
  const tabId = typeof args[0] === 'number' ? args[0] : null

  // execute reloader
  const reloaderArgs = (tabId === null
    ? ([] as any[])
    : ([tabId] as any[])
  ).concat([
    // TODO: convert to file to get replacements right
    { file: JSON.parse(ctScriptPathPlaceholder) },
    () => {
      // execute original script
      _executeScript(...(args as [any, any, any]))
    },
  ])

  _executeScript(...(reloaderArgs as [any, any, any]))
}

// Modify chrome.runtime.reload to unregister sw's
const _runtimeReload = chrome.runtime.reload
chrome.runtime.reload = () => {
  (async () => {
    await unregisterServiceWorkers()
    _runtimeReload()
  })()
}

let timestamp: number | undefined

const id = setInterval(async () => {
  const t = await fetch(timestampPathPlaceholder)
    .then((res) => {
      localStorage.removeItem('chromeExtensionReloaderErrors')
      return res.json()
    })
    .catch(handleFetchError)

  if (typeof timestamp === 'undefined') {
    timestamp = t
  } else if (timestamp !== t) {
    chrome.runtime.reload()
  }

  function handleFetchError(error: any) {
    clearInterval(id)

    const errors =
      localStorage.chromeExtensionReloaderErrors || 0

    if (errors < 5) {
      localStorage.chromeExtensionReloaderErrors = errors + 1

      // Should reload at least once if fetch fails.
      // The fetch will fail if the timestamp file is absent,
      // thus the new build does not include the reloader
      return 0
    } else {
      console.log(
        'rollup-plugin-chrome-extension simple reloader error:',
      )
      console.error(error)

      return timestamp
    }
  }
}, 1000)

async function unregisterServiceWorkers() {
  try {
    const registrations = await navigator.serviceWorker.getRegistrations()
    await Promise.all(registrations.map((r) => r.unregister()))
  } catch (error) {
    console.error(error)
  }
}
