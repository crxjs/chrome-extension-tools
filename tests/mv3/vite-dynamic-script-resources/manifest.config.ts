import { defineDynamicResource, defineManifestV3 } from 'src/.'

export default defineManifestV3({
  background: {
    service_worker: 'src/background.ts',
  },
  description: 'test extension',
  manifest_version: 3,
  name: 'test extension',
  version: '1.0.0',
  web_accessible_resources: [
    defineDynamicResource({
      matches: ['https://google.com/*', 'https://github.com/*'],
    }),
  ],
})
