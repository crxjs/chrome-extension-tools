/* eslint-env browser */
/* eslint-env webextensions */

// Firebase manual chunk
import { setupMessaging } from './config-client'

import serviceWorkerPath from './client.sw'

const reload = () => chrome.runtime.reload()

const onMessage = async (event) => {
  console.log(event)

  // RESEARCH: service worker registration addEventListener event data
  // TODO: handle "client-reload" message
  // TODO: handle "client-load" message

  reload()
}

export const onLoad = async ({ messaging }) => {
  // Register token on load success
  const token = await messaging.getToken()

  // TODO: use fetch request to register token
  // RESEARCH: fetch request json to firebase function
  // - The client is not authenticated, so cannot use
  //   functions.https.onRequest
  return fetch('registerToken', { uid: '%UID%', token })
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
