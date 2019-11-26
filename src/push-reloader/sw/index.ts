/* eslint-env browser */
/* eslint-env serviceworker */
/* global chrome */
declare var self: ServiceWorkerGlobalScope
declare var chrome: {
  runtime: {
    getBackgroundClient: () => Client
  }
}

import { setupMessaging } from './config-worker'

// TODO: handle user account deletion?

// Just return a promise or use an async function
// - No need to use event.waitUntil, this is handled in ./config-worker
const onPush = async (event: PushEvent) => {
  const { message } = event.data?.json().data

  const client = await chrome.runtime.getBackgroundClient()

  switch (message) {
    case 'client-load': {
      const notifications = await self.registration.getNotifications()

      notifications.forEach((n) => n.close())

      const title = 'Reload done and waiting...'

      await self.registration.showNotification(title)

      return client.postMessage({ message })
    }

    case 'client-reload': {
      const title = 'Will reload now...'

      await self.registration.showNotification(title)

      return client.postMessage({ message })
    }

    default: {
      console.error('Unexpected push message type')
    }
  }
}

// We're not using this right now.
const onMessage = async (event: ExtendableMessageEvent) => {
  console.log(event)
}

setupMessaging({ onPush, onMessage })
