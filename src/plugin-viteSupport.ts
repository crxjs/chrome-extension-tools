import { RPCEPlugin } from './types'

export const chunkFileNames = 'modules/[name]-[hash].js'
export const entryFileNames = '[name].js'
export const assetFileNames = 'assets/[name]-[hash].[ext]'

export const viteSupport = (): RPCEPlugin => ({
  name: 'vite-support',
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
