/* eslint-env browser */
/* eslint-env webextensions */

// Firebase manual chunk
import { setupMessaging } from './config-client'

// TODO: configure rp-bundle-imports
import serviceWorkerPath from 'client.sw.js'

const reload = () => chrome.runtime.reload()

const onMessage = async (event) => {
  // TODO: respond to reload message
  console.log(event)

  setTimeout(() => {
    reload()
  }, 500)
}

setupMessaging({ serviceWorkerPath, onMessage })
