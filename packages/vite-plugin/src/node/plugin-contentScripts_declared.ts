import { ConfigEnv, ResolvedConfig, UserConfig } from 'vite'
import { getOptions } from './plugin-optionsProvider'
import { CrxPluginFn } from './types'
import { isAbsolute, join, relative, dirname } from './path'

/**
 * This plugin injects CSS imports into content scripts during serve mode.
 *
 * When CSS files are declared in the manifest's content_scripts.css array, this
 * plugin automatically injects import statements for those CSS files into the
 * corresponding JS content scripts. This enables HMR support for
 * manifest-declared CSS files.
 *
 * Example: If manifest has: content_scripts: [{ js: ["src/content.ts"], css:
 * ["src/styles.css"] }]
 *
 * The content.ts file will be transformed to include: import "./styles.css"; //
 * ... rest of content.ts
 */
export const pluginDeclaredContentScripts: CrxPluginFn = () => {
  // Map from content script JS path to its associated CSS files
  const contentScriptCssMap = new Map<string, string[]>()
  let config: ResolvedConfig

  const buildCssMap = async (userConfig: UserConfig, env: ConfigEnv) => {
    const { manifest: _manifest } = await getOptions(userConfig)

    const manifest = await (typeof _manifest === 'function'
      ? _manifest(env)
      : _manifest)

    contentScriptCssMap.clear()

    for (const contentScript of manifest.content_scripts || []) {
      const { js = [], css = [] } = contentScript
      if (css.length === 0) continue

      for (const jsFile of js) {
        const existing = contentScriptCssMap.get(jsFile) || []
        contentScriptCssMap.set(jsFile, [...existing, ...css])
      }
    }
  }

  return {
    name: 'crx:content-scripts-declared',
    apply: 'serve',
    async config(userConfig, env) {
      await buildCssMap(userConfig, env)
    },
    configResolved(_config) {
      config = _config
    },
    transform(code, id) {
      // Only process during serve mode
      if (config.command !== 'serve') return

      // Get the relative path from root to check against manifest paths
      const relativePath = relative(config.root, id)

      // Check if this file is a content script with associated CSS
      const cssFiles = contentScriptCssMap.get(relativePath)
      if (!cssFiles || cssFiles.length === 0) return

      // Generate import statements for each CSS file
      // Use relative paths from the content script's directory
      const jsDir = dirname(id)
      const cssImports = cssFiles
        .map((cssPath) => {
          // Convert manifest path to absolute path
          const absoluteCssPath = isAbsolute(cssPath)
            ? cssPath
            : join(config.root, cssPath)
          // Get relative path from JS file to CSS file
          let relativeCssPath = relative(jsDir, absoluteCssPath)
          // Ensure it starts with ./ for relative imports
          if (
            !relativeCssPath.startsWith('.') &&
            !relativeCssPath.startsWith('/')
          ) {
            relativeCssPath = './' + relativeCssPath
          }
          return `import '${relativeCssPath}';`
        })
        .join('\n')

      // Prepend CSS imports to the content script
      return {
        code: cssImports + '\n' + code,
        map: null,
      }
    },
  }
}
