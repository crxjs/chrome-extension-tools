/* eslint-env browser */
/* globals chrome */

import {
  ctScriptPathPlaceholder,
  executeScriptPlaceholder,
  loadMessagePlaceholder,
  timestampPathPlaceholder,
  unregisterServiceWorkersPlaceholder,
} from '../CONSTANTS'

import localforage from 'localforage'

// Log load message to browser dev console
console.log(loadMessagePlaceholder.slice(1, -1))

const manifest = chrome.runtime.getManifest()
const isMV2 = manifest.manifest_version === 2

const options = {
  executeScript: isMV2 && JSON.parse(executeScriptPlaceholder),
  unregisterServiceWorkers:
    isMV2 && JSON.parse(unregisterServiceWorkersPlaceholder),
}

/* ----------- UNREGISTER SERVICE WORKERS ---------- */

async function unregisterServiceWorkers() {
  try {
    const registrations = await navigator.serviceWorker.getRegistrations()
    await Promise.all(registrations.map((r) => r.unregister()))
  } catch (error) {
    console.error(error)
  }
}

/* ----------- TRICK SERVICE WORKER OPEN ----------- */

const ports = new Set<chrome.runtime.Port>()
function reloadContentScripts() {
  ports.forEach((port) => {
    port.postMessage({ type: 'reload' })
  })
}
chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== 'simpleReloader') return
  ports.add(port)
  port.onDisconnect.addListener(() => ports.delete(port))
})

/* -------------- CHECK TIMESTAMP.JSON ------------- */

const timestampKey = 'chromeExtensionReloaderTimestamp'
const errorsKey = 'chromeExtensionReloaderErrors'
const interval = setInterval(async () => {
  try {
    const res = await fetch(timestampPathPlaceholder)
    const t = await res.json()
    await localforage.removeItem(errorsKey)
    const timestamp =
      (await localforage.getItem(timestampKey)) ?? undefined

    if (typeof timestamp === 'undefined') {
      await localforage.setItem(timestampKey, t)
    } else if (timestamp !== t) {
      chrome.runtime.reload()
    }
  } catch (error) {
    const errors =
      (await localforage.getItem<number>(errorsKey)) ?? 0

    if (errors < 5) {
      await localforage.setItem(errorsKey, errors + 1)
    } else {
      clearInterval(interval)

      console.log(
        'rollup-plugin-chrome-extension simple reloader error:',
      )
      console.error(error)
    }
  }
}, 1000)

/* ------------ POLYFILL RUNTIME.RELOAD ------------ */

// Other calls to runtime.reload
//  should also perform the same tasks
const _runtimeReload = chrome.runtime.reload
chrome.runtime.reload = () => {
  ;(async () => {
    // Stop checking the timestamp
    clearInterval(interval)
    // Clean up storage
    await localforage.removeItem(timestampKey)
    // Reload the content scripts
    reloadContentScripts()
    // Unregister service workers in MV2
    if (options.unregisterServiceWorkers)
      await unregisterServiceWorkers()
    // Reload the extension
    _runtimeReload()
  })()
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

  // @ts-expect-error executeScript has a complex return type
  chrome.tabs.executeScript = async (...args: any[]): void => {
    const tabId = typeof args[0] === 'number' ? args[0] : null
    const argsBase = (tabId === null ? [] : [tabId]) as any[]

    const [done] = await withP(
      ...(argsBase.concat({ code: checkMarker }) as [any, any]),
    )

    // Don't add reloader if it's already there
    if (!done) {
      await withP(
        ...(argsBase.concat({ code: addMarker }) as [any, any]),
      )

      // execute reloader
      const reloaderArgs = argsBase.concat([
        { file: JSON.parse(ctScriptPathPlaceholder) },
      ]) as [any, any]

      await withP(...reloaderArgs)
    }

    return _executeScript(...(args as [any, any, any]))
  }
}
