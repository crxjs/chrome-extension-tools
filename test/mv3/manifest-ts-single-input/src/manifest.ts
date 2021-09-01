import { ManifestV3 } from '$src/index'

const config: ManifestV3 = {
  action: {
    default_popup: 'popup.html',
  },
  background: {
    service_worker: 'service_worker.ts',
  },
  content_scripts: [
    {
      js: ['content.ts'],
      matches: ['https://*/*', 'http://*/*'],
    },
  ],
  manifest_version: 3,
}

export default config
