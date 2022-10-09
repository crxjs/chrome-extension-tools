import { crx } from '../../plugin-testOptionsProvider'
import { join } from 'path/posix'
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
              // this file is web accessible; it supports HMR b/c it's declared in `rollupOptions.input`
              'src/sidebar.html',
              // this static HTML file is web accessible; CRXJS copies it directly (static assets should be in public dir)
              'src/static.html',
              // this static HTML file in `public/` is web accessible; the path works b/c it's in the public dir
              'public.html',
              // If you're using a content script to load a web accessible HTML file in an iframe,
              // the assets of the web accessible HTMl file don't need to be web accessible 🤯
            ],
            matches: ['https://example.com/*'],
          },
        ],
      },
    }),
  ],
})
