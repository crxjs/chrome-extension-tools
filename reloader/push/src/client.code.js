/* eslint-env browser */
/* eslint-env webextensions */

// Firebase manual chunk
import { setupMessaging, registerToken } from './config-client'

const reload = () => chrome.runtime.reload()

const onMessage = async (event) => {
  const { message } = event.data

  if (message === 'client-load') {
    console.log('Reloader waiting...')
  } else if (message === 'client-reload') {
    console.log('Will reload now...')

    setTimeout(reload, 500)
  } else {
    console.log('Reloader received unknown message', message)
  }
}

const onLoad = async ({ messaging }) => {
  const token = await messaging.getToken()

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
