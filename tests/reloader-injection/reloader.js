import { reloader as r } from '../../reloader/push/src/index'

const uid = '%UID%'
const scriptPath = '%SCRIPT_PATH%'

const { updateManifest, createClientFiles } = r()

const _updateManifest = function(...args) {
  return updateManifest.call(this, ...args, {
    scriptPath,
  })
}

const _createClientFiles = function(...args) {
  return createClientFiles.call(this, ...args, { uid })
}

const _reloader = {
  name: 'spy-push-reloader',
  createClientFiles: jest.fn(_createClientFiles),
  updateManifest: jest.fn(_updateManifest),

  // Don't need to test firebase functionality
  startReloader: jest.fn(),
  reloadClients: jest.fn(),
}

export const reloader = () => _reloader
