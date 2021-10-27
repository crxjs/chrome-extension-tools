import { RPCEPlugin } from './types'

export const chunkFileNames = 'modules/[name]-[hash].js'
export const entryFileNames = '[name].js'
export const assetFileNames = 'assets/[name]-[hash].[ext]'

/**
 * Vite sets its own opinionated file names that don't work for a Chrome extension
 * This overwrites them with file names that make sense for our purposes
 * TODO: explore relaxing this constraint
 */
export const fileNames = (): RPCEPlugin => ({
  name: 'file-names',
  outputOptions(options) {
    // Entries must be in original location
    return {
      ...options,
      assetFileNames,
      chunkFileNames,
      entryFileNames,
    }
  },
})
