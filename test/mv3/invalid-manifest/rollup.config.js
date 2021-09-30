import { chromeExtension } from '$src'

export default {
  input: 'manifest.json',
  output: {
    dir: 'dist',
    format: 'esm',
  },
  plugins: [chromeExtension()],
}
