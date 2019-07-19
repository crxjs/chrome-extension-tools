/* eslint-env browser */
/* eslint-env webextensions */

// Firebase manual chunk
import { setupMessaging, registerToken } from './config-client'
import { loadMessage } from './loadMessage'

const reload = () => chrome.runtime.reload()

const onMessage = async (event) => {
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

const onLoad = async ({ messaging, registration }) => {
  const token = await messaging.getToken()
  const notifications = await registration.getNotifications()

  notifications.forEach((n) => n.close())

  console.log(loadMessage)

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
