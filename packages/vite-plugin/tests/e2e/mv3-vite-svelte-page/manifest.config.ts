import { defineManifest } from 'src/.'

export default defineManifest({
  manifest_version: 3,
  background: {
    service_worker: 'src/background.js',
    type: 'module',
  },
  content_scripts: [
    {
      matches: ['http://*/*'],
      js: ['src/content.js'],
    },
  ],
  options_page: 'src/index.html',
  name: 'test extension',
  version: '1.0.0',
})
