import { CrxPluginFn } from './types'

export const pluginWebAccessibleResources: CrxPluginFn = () => {
  throw new Error('plugin web accessible resources not implemented')
  return {
    name: 'crx:web-accessible-resources',
  }
}
