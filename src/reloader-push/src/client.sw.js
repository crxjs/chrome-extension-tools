/* eslint-env browser */
/* eslint-env serviceworker */
/* global chrome */

import { setupMessaging } from './config-worker'

// Just return a promise or use an async function
// - No need to use event.waitUntil, this is handled in ./config-worker
const onPush = async (event) => {
  console.log(event)

  const client = await chrome.runtime.getBackgroundClient()

  switch (event.data.message) {
    case 'client-load': {
      console.log('client-load')
      // TODO: handle "client-load" message

      const notifications = await self.registration.getNotifications()
      console.log(notifications)

      // TODO: close/create notification
      // - get sw notifications
      // - update/create notification w/ load message
      //   "extension loaded successfully"

      const title = 'extension load success'

      return self.registration.showNotification(title)
    }

    case 'client-reload': {
      console.log('client-reload')

      const title = 'reloading extension'

      await self.registration.showNotification(title)

      return client.postMessage({ message: 'reload' })
    }

    default: {
      console.error('Unexpected push message type')
    }
  }
}

const onMessage = async (event) => {
  console.log(event)
}

setupMessaging({ onPush, onMessage })
