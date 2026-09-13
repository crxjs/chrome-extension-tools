import { contentScripts } from './contentScripts'
import { getFileName } from './fileWriter-utilities'
import { getOptions } from './plugin-optionsProvider'
import { CrxPluginFn } from './types'
import { iifeReloadBridgeId } from './virtualFileIds'

export const pluginContentScriptsCss: CrxPluginFn = () => {
  let injectCss: boolean
  return {
    name: 'crx:content-scripts-css',
    enforce: 'post',
    async config(config) {
      const { contentScripts = {} } = await getOptions(config)
      injectCss = contentScripts.injectCss ?? true
    },
    renderCrxManifest(manifest) {
      const iifeReloadBridgeFileName = getFileName({
        type: 'asset',
        id: iifeReloadBridgeId,
      })
      if (injectCss)
        if (manifest.content_scripts)
          for (const script of manifest.content_scripts)
            if (script.js)
              for (const fileName of script.js)
                if (fileName === iifeReloadBridgeFileName) {
                  continue
                } else if (contentScripts.has(fileName)) {
                  const { css } = contentScripts.get(fileName)!
                  if (css?.length) script.css = [script.css ?? [], css].flat()
                } else {
                  throw new Error(
                    `Content script is undefined by fileName: ${fileName}`,
                  )
                }
      return manifest
    },
  }
}
