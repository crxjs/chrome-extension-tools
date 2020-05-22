declare let self: ServiceWorkerGlobalScope
declare let chrome: {
  runtime: {
    getBackgroundClient: () => Promise<Client>
  }
}

import { setupMessaging } from './config-worker'

// TODO: handle user account deletion?

// Just return a promise or use an async function
// - No need to use event.waitUntil, this is handled in ./config-worker
const onPush = async (event: PushEvent) => {
  if (!event.data) return

  // eslint-disable-next-line
  const { message } = event.data.json().data

  const client = await chrome.runtime.getBackgroundClient()

  switch (message) {
    case 'client-load': {
      const notifications = await self.registration.getNotifications()

      notifications.forEach((n) => n.close())

      const title = 'Reload done and waiting...'

      await self.registration.showNotification(title)

      // eslint-disable-next-line
      return client.postMessage({ message })
    }

    case 'client-reload': {
      const title = 'Will reload now...'

      await self.registration.showNotification(title)

      // eslint-disable-next-line
      return client.postMessage({ message })
    }

    default: {
      console.error('Unexpected push message type')
    }
  }
}

// We're not using this right now.
// eslint-disable-next-line
// @ts-ignore
const onMessage = (event: ExtendableMessageEvent) => {
  console.log(event)
}

setupMessaging({ onPush, onMessage })
