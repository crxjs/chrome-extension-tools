import { defineManifest } from '../../plugin-testOptionsProvider'

export default defineManifest({
  manifest_version: 3,
  name: 'Main World Network Intercept Test',
  version: '1.0.0',
  description: 'Test MAIN world content script network interception',
  content_scripts: [
    {
      matches: ['https://example.com/*'],
      js: ['src/interceptor.iife.ts'],
      world: 'MAIN',
      run_at: 'document_start',
    },
  ],
  host_permissions: ['https://example.com/*'],
})
