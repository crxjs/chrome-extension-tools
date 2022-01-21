import { CrxPlugin } from './types'

export const rollupVendorsChunk = (): CrxPlugin => {
  let disablePlugin: boolean
  return {
    name: 'rollup-vendors-chunk',
    config() {
      disablePlugin = true
    },
    outputOptions(options) {
      if (disablePlugin) return
      if (options.manualChunks) return

      options.manualChunks = (
        id: string,
      ): string | undefined => {
        if (id.includes('node_modules')) {
          return 'vendor'
        }
        return
      }

      return options
    },
  }
}
