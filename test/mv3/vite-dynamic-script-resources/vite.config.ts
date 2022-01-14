import { chromeExtension } from '$src'
import { defineConfig } from 'vite'
import inspectFn from 'vite-plugin-inspect'

process.chdir(__dirname)

const inspect = inspectFn()
// @ts-expect-error don't worry
inspect.crx = true

export default defineConfig({
  root: 'src',
  clearScreen: false,
  logLevel: 'error',
  build: {
    minify: false,
    emptyOutDir: true,
  },
  plugins: [chromeExtension(), inspect],
})
