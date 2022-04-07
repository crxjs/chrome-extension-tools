import { crx } from 'src/.'
import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    minify: false,
    rollupOptions: {
      output: {
        // the hash randomly changes between environments
        assetFileNames: 'assets/[name].hash.[ext]',
        chunkFileNames: 'assets/[name].hash.js',
        entryFileNames: 'assets/[name].hash.js',
      },
    },
  },
  clearScreen: false,
  logLevel: 'error',
  plugins: [
    crx({
      manifest: {
        manifest_version: 3,
        version: '1.0.0',
        name: 'Extension with copied assets',
        default_locale: 'en',
        action: {
          default_icon: {
            16: 'src/icons/action-icon-16.png',
            32: 'src/icons/action-icon-32.png',
            48: 'src/icons/action-icon-48.png',
            128: 'src/icons/action-icon-128.png',
          },
        },
        icons: {
          16: 'src/icons/manifest-icon-16.png',
          32: 'src/icons/manifest-icon-32.png',
          48: 'src/icons/manifest-icon-48.png',
          128: 'src/icons/manifest-icon-128.png',
        },
        declarative_net_request: {
          rule_resources: [
            {
              id: 'ruleset_1',
              enabled: true,
              path: 'rules/set-1.json',
            },
            {
              id: 'ruleset_2',
              enabled: false,
              path: 'rules/set-2.json',
            },
          ],
        },
        web_accessible_resources: [
          {
            resources: ['src/images/*.png'],
            matches: ['https://www.google.com/*'],
          },
        ],
      },
    }),
  ],
})
