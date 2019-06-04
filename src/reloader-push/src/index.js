import { updateUserTime, loginAnonymously } from './config-index'
import clientCode from './client.code'

const state = {
  // Anonymous UID from Firebase
  // uid: string,
  // Interval ID for updateUid
  // interval: number,
}

export function start() {
  loginAnonymously()
    .then((uid) => {
      state.uid = uid

      const update = updateUserTime(state)
      state.interval = setInterval(update, 5 * 60 * 1000)
    })
    .catch((error) => {
      console.log('Could not start push reloader')
      console.error(error)
    })
}

export function reload() {
  // TODO: add firebase functions through cli
  // TODO: call reloadClient
}

export function getClientCode() {
  // TODO: configure client reloader code
  // - replace %UID%
  return clientCode
}

export function updateManifest(manifest, path) {
  // TODO: Update for push notifications
  if (!manifest.background) {
    manifest.background = {}
  }

  const { scripts = [] } = manifest.background

  manifest.background.scripts = [...scripts, path]

  if (manifest.background.persistent === undefined) {
    manifest.background.persistent = false
  }

  manifest.description =
    'DEVELOPMENT BUILD with auto-reloader script.'
}
