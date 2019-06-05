/* eslint-env browser */
/* eslint-env serviceworker */
/* global chrome */

import { setupMessaging } from './config-worker'

const onPush = async (event) => {
  console.log(event)

  const client = await chrome.runtime.getBackgroundClient()

  client.postMessage({ message: 'reload' })

  // TODO: emit notification
  // RESEARCH: service worker create notification (look in fb-examples)
  // - before reload? "reloading extension"
}

const onMessage = async (event) => {
  console.log(event)

  // TODO: update/create notification
  // RESEARCH: get previously created service worker notifications
  // RESEARCH: update previously created service worker notifications
  // - get sw notifications
  // - update/create notification w/ load message
  //   "extension loaded successfully"
}

setupMessaging({ onPush, onMessage })
