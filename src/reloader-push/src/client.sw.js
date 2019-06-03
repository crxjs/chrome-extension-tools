/* eslint-env browser */
/* eslint-env serviceworker */
/* global chrome */

import { setupMessaging } from './config-worker'

const onMessage = async (event) => {
  console.log(event)

  // TODO: get/wake extension as client
  // TODO: send client a reload message
  // TODO: emit notification
  const client = await chrome.runtime.getBackgroundClient()

  client.postMessage({ message: 'reload' })
}

setupMessaging({ onMessage })
