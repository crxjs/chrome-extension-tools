/* eslint-env browser */
/* eslint-env webextensions */

// Firebase manual chunk
import { setupMessaging, registerToken } from './config-client'

const reload = () => chrome.runtime.reload()

const onMessage = async (event) => {
  console.log('onMessage', event)

  const { message } = event.data

  // TODO: handle "client-reload" message
  // TODO: handle "client-load" message

  if (message === 'client-load') {
    console.log('load', message)
  } else if (message === 'client-reload') {
    console.log('reload', message)
    reload()
  } else {
    console.log('unknown message', message)
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
