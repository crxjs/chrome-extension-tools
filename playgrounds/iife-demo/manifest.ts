import { defineManifest } from '@crxjs/vite-plugin'

export default defineManifest({
  manifest_version: 3,
  name: 'IIFE Content Script Demo',
  version: '1.0.0',
  description: 'Demo of IIFE content scripts for main-world injection',
  icons: {
    48: 'public/icon.png',
  },
  permissions: ['scripting'],
  host_permissions: ['<all_urls>'],
  background: {
    service_worker: 'src/background.ts',
    type: 'module',
  },
})
