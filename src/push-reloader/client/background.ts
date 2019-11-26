/* eslint-env browser */
/* eslint-env webextensions */

// Firebase manual chunk
import { setupMessaging, registerToken } from './config-client'

const reload = () => chrome.runtime.reload()

const onMessage = async (event: MessageEvent) => {
  const { message } = event.data

  if (message === 'client-load') {
    console.log('Reloader ready and waiting...')
  } else if (message === 'client-reload') {
    console.log('Will reload now...')

    setTimeout(reload, 500)
  } else {
    console.log('Reloader received unknown message', message)
  }
}

const onLoad = async ({
  messaging,
  registration,
}: {
  messaging: firebase.messaging.Messaging
  registration: ServiceWorkerRegistration
}) => {
  const token = await messaging.getToken()
  const notifications = await registration.getNotifications()

  notifications.forEach((n) => n.close())

  console.log('%LOAD_MESSAGE%')

  return registerToken({ uid: '%UID%', token })
}

setupMessaging({
  serviceWorkerPath: '%SW_PATH%',
  onMessage,
})
  .then(onLoad)
  .catch((error) => {
    console.log('AUTO-RELOADER ERROR:')
    console.error(error)
  })
