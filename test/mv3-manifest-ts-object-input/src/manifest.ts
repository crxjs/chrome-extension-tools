import { ManifestV3 } from '../../../../src'

const config: ManifestV3 = {
  content_scripts: [
    {
      js: ['content.ts'],
      matches: ['https://*/*', 'http://*/*'],
    },
  ],
  manifest_version: 3,
}

export default config
