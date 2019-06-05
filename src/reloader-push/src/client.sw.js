/* eslint-env browser */
/* eslint-env serviceworker */
/* global chrome */

import { setupMessaging } from './config-worker'

const onPush = async (event) => {
  console.log(event)

  // TODO: get/wake extension as client
  const client = await chrome.runtime.getBackgroundClient()

  // TODO: send client a reload message
  client.postMessage({ message: 'reload' })

  // TODO: emit notification
  // - before reload? "reloading extension"
}

const onMessage = async (event) => {
  console.log(event)

  // TODO: update/create notification
  // - get sw notifications
  // - update/create notification w/ load message
  //   "extension loaded successfully"
}

setupMessaging({ onPush, onMessage })
