import { CrxPluginFn } from './types'

/** Runs Rollup on andles */
export const pluginFileWriter: CrxPluginFn = () => {
  throw new Error('plugin file writer not implemented')
  return {
    name: 'crx:file-writer',
  }
}
