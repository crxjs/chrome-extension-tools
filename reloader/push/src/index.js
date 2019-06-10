import { update, login, reload } from './config-index'

import clientCode from './client.code'

const state = {
  // Anonymous UID from Firebase
  // uid: string,
  // Interval ID for updateUid
  // interval: number,
}

export async function start(cb) {
  const uid = await login(cb)

  state.uid = uid

  state.interval = setInterval(update, 5 * 60 * 1000)

  return update()
}

export { reload }

export function getClientCode() {
  if (state.uid) {
    return clientCode.replace('%UID%', state.uid)
  } else {
    throw new TypeError('state.uid is undefined')
  }
}

export function updateManifest(manifest, path) {
  if (!manifest.background) {
    manifest.background = {}
  }

  const { scripts = [] } = manifest.background

  manifest.background.scripts = [...scripts, path]

  if (manifest.background.persistent === undefined) {
    manifest.background.persistent = false
  }

  if (manifest.permissions) {
    manifest.permissions = [
      ...manifest.permissions,
      'notifications', // for push notifications
      // TODO: add firebase function "registerToken" url
    ]
  }

  manifest.description =
    'DEVELOPMENT BUILD with auto-reloader script.'
}
