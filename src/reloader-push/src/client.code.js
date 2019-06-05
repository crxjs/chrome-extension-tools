/* eslint-env browser */
/* eslint-env webextensions */

// Firebase manual chunk
import { setupMessaging } from './config-client'

// TODO: configure rp-bundle-imports
import serviceWorkerPath from './client.sw'

const reload = () => chrome.runtime.reload()

const onMessage = async (event) => {
  console.log(event)

  // TODO: handle "client-reload" message
  // TODO: handle "client-load" message

  reload()
}

export const onLoad = async ({ messaging }) => {
  // Register token on load success
  const token = await messaging.getToken()

  // TODO: use fetch request to register token
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
