import { defineManifest } from '../../plugin-testOptionsProvider'

export default defineManifest({
  manifest_version: 3,
  name: 'Dynamic Main World Network Intercept Test',
  version: '1.0.0',
  description: 'Test dynamic MAIN world content script network interception',
  background: {
    service_worker: 'src/background.ts',
  },
  host_permissions: ['https://example.com/*'],
  permissions: ['scripting'],
})
