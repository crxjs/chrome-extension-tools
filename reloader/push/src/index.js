import { update, login, reload } from './config-index'

import clientCode from './client.code'
import serviceWorkerCode from './sw.code'

const state = {
  // Anonymous UID from Firebase
  // uid: string,
  // Interval ID for updateUid
  // interval: number,
  // Path to service worker
  // swPath: string,
}

export async function start(cb) {
  const uid = await login(cb)

  state.uid = uid

  state.interval = setInterval(update, 5 * 60 * 1000)

  return update()
}

export { reload }

export function createClientFiles() {
  const emit = (name, code) => {
    const id = this.emitAsset(name, code)

    return this.getAssetFileName(id)
  }

  if (state.uid) {
    state.swPath = emit('reloader-sw.js', serviceWorkerCode)

    const clientPath = emit(
      'reloader-client.js',
      clientCode
        .replace('%UID%', state.uid)
        .replace('%SW_PATH%', state.swPath),
    )

    state.scriptPath = emit(
      'reloader-wrapper.js',
      `import('/${clientPath}')`,
    )
  } else {
    throw new TypeError('state.uid is undefined')
  }
}

export function updateManifest(manifest) {
  if (!manifest.background) {
    manifest.background = {}
  }

  const { scripts = [] } = manifest.background

  const {
    web_accessible_resources = [],
    permissions = [],
  } = manifest

  if (state.scriptPath) {
    manifest.background.scripts = [...scripts, state.scriptPath]

    manifest.web_accessible_resources = [
      ...web_accessible_resources,
      state.scriptPath,
    ]
  } else {
    throw new TypeError('state.scriptPath is undefined')
  }

  if (manifest.background.persistent === undefined) {
    manifest.background.persistent = false
  }

  if (manifest.permissions) {
    const perms = new Set(permissions)
    perms.add('notifications')
    perms.add(
      'https://us-central1-rpce-reloader.cloudfunctions.net/registerToken',
    )

    manifest.permissions = Array.from(perms)
  }

  manifest.description =
    'DEVELOPMENT BUILD with auto-reloader script.'
}
