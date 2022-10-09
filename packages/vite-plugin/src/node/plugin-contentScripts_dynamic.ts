import { CrxPluginFn } from './types'

/**
 * 1. Resolves `?script` import queries
 *
 * - Emits scripts to rollup or fileWriter
 * - Add scripts to contentScripts map
 * - Returns script w/ `?scriptId` query
 *
 *   - Build scriptId is refId from emitFile
 *   - Serve scriptId is ScriptFile id
 *
 * 2. Loads `?scriptId` queries as file name exports
 *
 * - Serve: await filesReady()
 * - Build: return import.meta.CRX_SCRIPT_<scriptId>
 *
 * 3. Render during build
 *
 * - Replace import.meta.CRX_SCRIPT_<scriptId> with output file name
 * - Do this during renderChunk or generateBundle?
 */
export const pluginDynamicContentScripts: CrxPluginFn = () => {
  throw new Error('plugin dynamic content scripts not implemented')
  return {
    name: 'crx:dynamic-content-scripts',
  }
}
