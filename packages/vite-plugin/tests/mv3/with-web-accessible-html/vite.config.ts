import { crx } from 'src/.'
import { join } from 'src/path'
import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    minify: false,
    rollupOptions: {
      // these html files support HMR and Vite production optimizations
      input: {
        // this file is web accessible (see manifest.web_accessible_resources)
        sidebar: join(__dirname, 'src/sidebar.html'),
        // this file is not web accessible
        welcome: join(__dirname, 'src/welcome.html'),
      },
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
        web_accessible_resources: [
          {
            resources: [
              // TODO: sidebar assets must also be web accessible
              // this file is web accessible; it supports HMR b/c it's declared in `rollupOptions.input`
              'src/sidebar.html',
              // this file is web accessible; CRXJS copies it directly
              'src/static.html',
              // must list static HTML file assets; static HTML is not parsed
              'src/static.js',
            ],
            matches: ['https://www.google.com/*'],
          },
        ],
      },
    }),
  ],
})
