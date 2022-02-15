import { defineManifestV3 } from 'src/.'

export default defineManifestV3({
  manifest_version: 3,
  action: { default_popup: 'src/popup.html' },
  name: 'test extension',
  version: '1.0.0',
})
