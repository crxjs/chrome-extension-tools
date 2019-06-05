/* eslint-env browser */
/* eslint-env webextensions */

// Firebase manual chunk
import firebase from '@firebase/app'
import '@firebase/messaging'
import '@firebase/functions'

import { config, publicVapidKey } from './config-firebase'

// Initialize full web app on import
firebase.initializeApp(config)

export const setupMessaging = async ({
  serviceWorkerPath,
  onMessage,
} = {}) => {
  const messaging = firebase.messaging()

  const registration = await navigator.serviceWorker.register(
    serviceWorkerPath,
  )

  messaging.useServiceWorker(registration)
  messaging.usePublicVapidKey(publicVapidKey)

  if (typeof onMessage === 'function') {
    registration.addEventListener('message', onMessage)
  } else {
    throw new TypeError('onMessage must be a function')
  }

  return { messaging, registration }
}

export { firebase }
