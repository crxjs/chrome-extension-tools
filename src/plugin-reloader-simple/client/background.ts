/* eslint-env browser */
/* globals chrome */

import {
  ctScriptPathPlaceholder,
  executeScriptPlaceholder,
  loadMessagePlaceholder,
  timestampPathPlaceholder,
  unregisterServiceWorkersPlaceholder,
} from '../CONSTANTS'

// Log load message to browser dev console
console.log(loadMessagePlaceholder.slice(1, -1))

const options = {
  executeScript: JSON.parse(executeScriptPlaceholder),
  unregisterServiceWorkers: JSON.parse(
    unregisterServiceWorkersPlaceholder,
  ),
}

/* ---------- POLYFILL TABS.EXECUTESCRIPT ---------- */

if (options.executeScript) {
  const markerId =
    'rollup-plugin-chrome-extension-simple-reloader'

  const addMarker = `{
    const tag = document.createElement('meta');
    tag.id = '${markerId}';
    document.head.append(tag);
  }`

  const checkMarker = `
  !!document.head.querySelector('#${markerId}')
  `

  // Modify chrome.tabs.executeScript to inject reloader
  const _executeScript = chrome.tabs.executeScript
  const withP = (...args: [any, any?]): Promise<any[]> =>
    new Promise((resolve, reject) => {
      // eslint-disable-next-line
      // @ts-ignore
      _executeScript(...args, (results) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError.message)
        } else {
          resolve(results)
        }
      })
    })

  chrome.tabs.executeScript = (...args: any[]): void => {
    ;(async () => {
      const tabId = typeof args[0] === 'number' ? args[0] : null
      const argsBase = (tabId === null ? [] : [tabId]) as any[]

      const [done] = await withP(
        ...(argsBase.concat({ code: checkMarker }) as [
          any,
          any,
        ]),
      )

      // Don't add reloader if it's already there
      if (!done) {
        await withP(
          ...(argsBase.concat({ code: addMarker }) as [
            any,
            any,
          ]),
        )

        // execute reloader
        const reloaderArgs = argsBase.concat([
          // TODO: convert to file to get replacements right
          { file: JSON.parse(ctScriptPathPlaceholder) },
        ]) as [any, any]

        await withP(...reloaderArgs)
      }

      _executeScript(...(args as [any, any, any]))
    })()
  }
}

/* ----------- UNREGISTER SERVICE WORKERS ---------- */

if (options.unregisterServiceWorkers) {
  // Modify chrome.runtime.reload to unregister sw's
  const _runtimeReload = chrome.runtime.reload
  chrome.runtime.reload = () => {
    ;(async () => {
      await unregisterServiceWorkers()
      _runtimeReload()
    })()
  }
}

async function unregisterServiceWorkers() {
  try {
    const registrations = await navigator.serviceWorker.getRegistrations()
    await Promise.all(registrations.map((r) => r.unregister()))
  } catch (error) {
    console.error(error)
  }
}

/* -------------- CHECK TIMESTAMP.JSON ------------- */

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
