/* eslint-env browser */
/* eslint-env webextensions */

// Firebase manual chunk
import { setupMessaging, registerToken } from './config-client'

import serviceWorkerPath from './client.sw'

// const reload = () => chrome.runtime.reload()

const onMessage = async (event) => {
  console.log('onMessage', event)

  // RESEARCH: service worker registration addEventListener event data
  // TODO: handle "client-reload" message
  // TODO: handle "client-load" message

  // reload()
}

export const onLoad = async ({ messaging }) => {
  const token = await messaging.getToken()

  return registerToken({ uid: '%UID%', token })
}

setupMessaging({
  serviceWorkerPath,
  onMessage,
})
  .then(onLoad)
  .catch((error) => {
    console.log('AUTO-RELOADER ERROR:')
    console.error(error)
  })
