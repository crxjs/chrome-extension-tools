/* -------------------------------------------- */
/*         SETUP MOCK RELOADER FOR TESTS        */
/* -------------------------------------------- */

import { reloader as r } from 'rpce-push-reloader'

const uid = '%UID%'
const bgScriptPath = '%BG_SCRIPT_PATH%'
const ctScriptPath = '%CT_SCRIPT_PATH%'

// Get reloader hooks
const { updateManifest, createClientFiles } = r()

// Create mock state
const _state = {
  bgScriptPath,
  ctScriptPath,
}

const _updateManifest = function(...args) {
  return updateManifest.call(this, ...args, _state)
}

const _createClientFiles = function(...args) {
  return createClientFiles.call(this, ...args, { uid })
}

/* --------------- MOCK RELOADER -------------- */

const _reloader = {
  name: 'spy-push-reloader',
  createClientFiles: jest.fn(_createClientFiles),
  updateManifest: jest.fn(_updateManifest),

  // Don't need to test firebase functionality
  startReloader: jest.fn(),
  reloadClients: jest.fn(),
}

export const reloader = () => _reloader
