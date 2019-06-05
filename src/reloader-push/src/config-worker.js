/* eslint-env browser */
/* eslint-env serviceworker */

// Give the service worker access to Firebase Messaging.
// Note that you can only use Firebase Messaging here,
// other Firebase libraries are not available to service workers.
import firebase from '@firebase/app'
import '@firebase/messaging'

import { messagingSenderId } from './config-firebase'

// Initialize the Firebase app in the service worker
// by passing in the messagingSenderId.
firebase.initializeApp({ messagingSenderId })

export const setupMessaging = async ({ onPush, onMessage }) => {
  // Add listeners before firebase.messaging()
  // in order to intercept PushEvents
  self.addEventListener('push', (event) => {
    event.stopImmediatePropagation()
    event.waitUntil(onPush(event))
  })

  self.addEventListener('message', (event) => {
    event.stopImmediatePropagation()
    event.waitUntil(onMessage(event))
  })

  // Retrieve an instance of Firebase Messaging
  // so that it can handle background messages.
  const messaging = firebase.messaging()

  // Should not fire because we are intercepting the push event.
  // Not a good fit for Chrome Extensions because the Chrome API
  // does not provide access to much in the service worker.
  messaging.setBackgroundMessageHandler(() => {
    console.error('backgroundMessageHandler should not fire')
  })

  return messaging
}
