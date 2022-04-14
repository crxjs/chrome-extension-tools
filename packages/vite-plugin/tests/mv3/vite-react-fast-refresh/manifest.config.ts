import { defineManifest } from 'src/.'

export default defineManifest({
  manifest_version: 3,
  action: { default_popup: 'src/popup.html' },
  content_scripts: [
    {
      matches: ['http://*/*'],
      js: ['src/content.tsx'],
    },
  ],
  name: 'test extension',
  version: '1.0.0',
})
