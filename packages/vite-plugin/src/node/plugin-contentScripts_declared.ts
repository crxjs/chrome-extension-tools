import { CrxPluginFn } from './types'

/**
 * 1. Renders manifest content scripts as loader files
 *
 * - Build: emits loaders as assets
 * - Serve: not needed b/c file name is deterministic
 */
export const pluginDeclaredContentScripts: CrxPluginFn = () => {
  throw new Error('plugin declared content scripts not implemented')
  return {
    name: 'crx:declared-content-scripts',
  }
}
