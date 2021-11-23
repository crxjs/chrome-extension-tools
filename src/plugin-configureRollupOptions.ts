import { CrxPlugin } from './types'

export const chunkFileNames = 'modules/[name]-[hash].js'
export const entryFileNames = '[name].js'
export const assetFileNames = 'assets/[name]-[hash].[ext]'

/**
 * Vite sets its own opinionated file names that don't work for a Chrome extension
 * This overwrites them with file names that make sense for our purposes
 */
export const configureRollupOptions = (): CrxPlugin => ({
  name: 'configure-rollup-options',
  crx: true,
  outputOptions(options) {
    return {
      ...options,
      assetFileNames,
      chunkFileNames,
      entryFileNames,
    }
  },
})
