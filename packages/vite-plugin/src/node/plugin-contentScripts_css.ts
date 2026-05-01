import { OutputAsset } from 'rollup'
import { contentScripts, SHADOW_CSS_PLACEHOLDER } from './contentScripts'
import { getOptions } from './plugin-optionsProvider'
import { CrxPluginFn } from './types'

export const pluginContentScriptsCss: CrxPluginFn = () => {
  let injectCss: boolean
  return {
    name: 'crx:content-scripts-css',
    enforce: 'post',
    async config(config) {
      const { contentScripts = {} } = await getOptions(config)
      injectCss = contentScripts.injectCss ?? true
    },
    renderCrxManifest(manifest, bundle) {
      if (injectCss)
        if (manifest.content_scripts)
          for (const script of manifest.content_scripts)
            if (script.js)
              for (const fileName of script.js)
                if (contentScripts.has(fileName)) {
                  const cs = contentScripts.get(fileName)!
                  // Skip CSS injection for shadow DOM scripts; their loader handles CSS via adoptedStyleSheets
                  if (cs.shadowDom) continue
                  if (cs.css?.length)
                    script.css = [script.css ?? [], cs.css].flat()
                } else {
                  throw new Error(
                    `Content script is undefined by fileName: ${fileName}`,
                  )
                }

      // Post-process shadow DOM loader assets: replace CSS placeholder with actual CSS URLs.
      // At this point, crx:web-accessible-resources has already populated cs.css with output filenames.
      if (bundle)
        for (const [, cs] of contentScripts) {
          if (!cs.shadowDom || !cs.loaderName) continue
          const cssUrls = cs.css || []
          const loaderAsset = bundle[cs.loaderName]
          if (loaderAsset && loaderAsset.type === 'asset') {
            const asset = loaderAsset as OutputAsset
            const source =
              typeof asset.source === 'string'
                ? asset.source
                : new TextDecoder().decode(asset.source)
            // Replace the placeholder array with the actual CSS URLs
            asset.source = source.replace(
              JSON.stringify([SHADOW_CSS_PLACEHOLDER]),
              JSON.stringify(cssUrls),
            )
          }
        }

      return manifest
    },
  }
}
