import {
  updateManifest,
  createClientFiles,
} from '../../reloader/push/src/index'

const uid = '%UID%'
const scriptPath = '%SCRIPT_PATH%'

const _updateManifest = function(...args) {
  return updateManifest.call(this, ...args, {
    scriptPath,
  })
}

const _createClientFiles = function(...args) {
  return createClientFiles.call(this, ...args, { uid })
}

export const reloader = {
  createClientFiles: jest.fn(_createClientFiles),
  updateManifest: jest.fn(_updateManifest),

  // Don't need to test firebase functionality
  start: jest.fn(),
  reload: jest.fn(),
}
