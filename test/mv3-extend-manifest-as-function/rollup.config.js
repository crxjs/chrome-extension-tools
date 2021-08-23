import { chromeExtension } from '$src'
import commonjs from '@rollup/plugin-commonjs'
import resolve from '@rollup/plugin-node-resolve'
import path from 'path'

export default {
  input: path.join(__dirname, 'manifest.json'),
  output: {
    dir: path.join(__dirname, 'dist'),
    format: 'esm',
  },
  plugins: [
    chromeExtension({
      verbose: false,
      extendManifest: ({
        name,
        description,
        background,
        ...manifest
      }) => {
        background.persistent = true

        return Object.assign(manifest, {
          name: name + '123',
          description: description
            .split('')
            .reverse()
            .join(''),
          background,
          options_page: 'options.html',
          ...manifest,
        })
      },
    }),
    resolve(),
    commonjs(),
  ],
}
