import { chromeExtension } from '$src'
import path from 'path'

export default {
  input: [
    path.join(__dirname, 'manifest.json'),
    path.join(__dirname, 'index.html'),
  ],
  output: {
    dir: path.join(__dirname, 'dist'),
    format: 'esm',
  },
  plugins: [chromeExtension({ verbose: false })],
}
