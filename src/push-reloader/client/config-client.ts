/* eslint-env browser */
/* eslint-env webextensions */

// Firebase manual chunk
import firebase from 'firebase/app'
import 'firebase/messaging'
import 'firebase/functions'

import { config, publicVapidKey } from '../CONFIG'

// Initialize full web app on import
const app = firebase.initializeApp(config, 'reloader')

export const setupMessaging = async (
  { serviceWorkerPath, onMessage } = {} as {
    serviceWorkerPath: string
    onMessage: (
      this: ServiceWorkerContainer,
      ev: MessageEvent,
    ) => any
  },
) => {
  const messaging = app.messaging()

  const registration = await navigator.serviceWorker.register(
    serviceWorkerPath,
  )

  messaging.useServiceWorker(registration)
  messaging.usePublicVapidKey(publicVapidKey)

  if (typeof onMessage === 'function') {
    navigator.serviceWorker.addEventListener(
      'message',
      onMessage,
    )
  } else {
    throw new TypeError('onMessage must be a function')
  }

  return { messaging, registration }
}

export const registerToken = app
  .functions()
  .httpsCallable('registerToken')

export { firebase }
