import { ResolvedConfig } from 'vite'
import { CrxPluginFn } from './types'
import {
  contentCssPrefix,
  getContentCssId,
  getContentCssIndex,
  isContentCssId,
} from './virtualFileIds'

/**
 * Content script CSS entry information. Stored by index corresponding to the
 * content_scripts array in the manifest.
 */
export interface ContentCssEntry {
  /** Index in the manifest's content_scripts array */
  index: number
  /** CSS file paths from the manifest */
  cssFiles: string[]
  /** The virtual module ID for this entry */
  virtualId: string
}

/** Map from content_scripts index to CSS entry info */
const contentCssEntries = new Map<number, ContentCssEntry>()

/**
 * Get all registered CSS entries. Used by plugin-manifest to inject synthetic
 * entries into the manifest.
 */
export function getContentCssEntries(): ContentCssEntry[] {
  return Array.from(contentCssEntries.values())
}

/** Clear all CSS entries. Called when manifest is reprocessed. */
export function clearContentCssEntries(): void {
  contentCssEntries.clear()
}

/** Register a CSS entry for a content_scripts index. */
export function registerContentCssEntry(
  index: number,
  cssFiles: string[],
): ContentCssEntry {
  const virtualId = getContentCssId(index)
  const entry: ContentCssEntry = { index, cssFiles, virtualId }
  contentCssEntries.set(index, entry)
  return entry
}

/**
 * This plugin creates synthetic virtual modules for CSS declared in manifest
 * content_scripts.
 *
 * Instead of injecting CSS imports into each JS content script, this plugin:
 *
 * 1. Creates a virtual module for each content_scripts entry that has CSS
 * 2. The virtual module contains import statements for all CSS files
 * 3. Plugin-manifest adds this virtual module as the first JS entry in
 *    content_scripts
 *
 * This approach:
 *
 * - Keeps content script JS files clean (no injected imports)
 * - Loads CSS only once, not per JS file
 * - Works correctly with dynamically registered content scripts
 * - Enables HMR for manifest-declared CSS files
 *
 * Example: If manifest has:
 *
 * ```json
 * content_scripts: [{
 *   js: ["src/content.ts"],
 *   css: ["src/styles.css"]
 * }]
 * ```
 *
 * A virtual module `/@crx/content-css/0` is created containing:
 *
 * ```js
 * import '/src/styles.css'
 * ```
 *
 * And the manifest is transformed during serve to:
 *
 * ```json
 * content_scripts: [{
 *   js: ["/@crx/content-css/0", "src/content.ts"],
 *   css: ["src/styles.css"]
 * }]
 * ```
 */
export const pluginDeclaredContentScripts: CrxPluginFn = () => {
  let config: ResolvedConfig

  return {
    name: 'crx:content-scripts-declared-css',
    apply: 'serve',
    configResolved(_config) {
      config = _config
    },
    resolveId(source) {
      // Handle synthetic CSS content script virtual modules
      if (isContentCssId(source)) {
        return source
      }
    },
    load(id) {
      // Load synthetic CSS content script virtual modules
      if (!isContentCssId(id)) return

      const index = getContentCssIndex(id)
      if (index === null) return

      const entry = contentCssEntries.get(index)
      if (!entry) {
        console.warn(
          `[crx:content-scripts-declared-css] No CSS entry found for index ${index}`,
        )
        return ''
      }

      // Generate import statements for each CSS file
      // Use absolute paths from root for Vite to resolve correctly
      const cssImports = entry.cssFiles
        .map((cssPath) => {
          // Ensure path starts with / for absolute import from root
          const importPath = cssPath.startsWith('/') ? cssPath : `/${cssPath}`
          return `import "${importPath}";`
        })
        .join('\n')

      return cssImports + '\n'
    },
  }
}
