import { defineManifest } from 'src/.'

export default defineManifest({
  background: {
    service_worker: 'src/background.ts',
  },
  content_scripts: [
    {
      js: ['src/declared-script.ts'],
      matches: ['https://a.com/*', 'http://b.com/*'],
    },
  ],
  manifest_version: 3,
  name: 'test extension',
  version: '1.0.0',
})
