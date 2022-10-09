import { CrxPluginFn } from './types'

/**
 * Plugin-manifest handles declared content scripts:
 *
 * - Emits content scripts during transformCrxManifest
 * - Emits loaders during renderCrxManifest
 *
 * Not currently any need for a declared content script plugin!
 */
export const pluginDeclaredContentScripts: CrxPluginFn = () => {
  return []
}
