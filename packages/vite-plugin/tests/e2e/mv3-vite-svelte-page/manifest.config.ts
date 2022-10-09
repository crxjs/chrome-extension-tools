import { defineManifest } from '../../plugin-testOptionsProvider'

export default defineManifest({
  manifest_version: 3,
  background: {
    service_worker: 'src/background.js',
    type: 'module',
  },
  options_page: 'src/index.html',
  name: 'test extension',
  version: '1.0.0',
})
