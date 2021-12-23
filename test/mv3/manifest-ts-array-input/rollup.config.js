import commonjs from '@rollup/plugin-commonjs'
import resolve from '@rollup/plugin-node-resolve'
import esbuild from 'rollup-plugin-esbuild'
import { chromeExtension } from '$src'
import path from 'path'

const outDir = path.join(__dirname, 'dist')
export default {
  input: [
    path.join(__dirname, 'src', 'manifest.ts'),
    path.join(__dirname, 'src', 'script.ts'),
  ],
  output: {
    dir: outDir,
    format: 'esm',
    chunkFileNames: 'chunks/[name]-[hash].js',
  },
  plugins: [chromeExtension(), resolve(), commonjs(), esbuild()],
}
