import { defineManifest } from '../../plugin-testOptionsProvider'

export default defineManifest({
  manifest_version: 3,
  content_scripts: [
    {
      matches: ['https://www.google.com/*'],
      js: ['src/content.js'],
    },
  ],
  name: 'test extension',
  version: '1.0.0',
})
