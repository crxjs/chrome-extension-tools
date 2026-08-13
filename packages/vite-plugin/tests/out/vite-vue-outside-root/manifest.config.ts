import { defineManifest } from '../../plugin-testOptionsProvider'

export default defineManifest({
  manifest_version: 3,
  content_scripts: [
    {
      matches: ['http://*/*'],
      js: ['src/content.ts'],
    },
  ],
  name: 'outside-root Vue extension',
  version: '1.0.0',
})
