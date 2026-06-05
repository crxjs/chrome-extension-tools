import { build, mergeConfig, InlineConfig, ResolvedConfig, UserConfig } from 'vite'
import { contentScripts } from './contentScripts'
import { formatFileData } from './fileWriter-utilities'
import { basename, dirname, join } from './path'
import { getOptions } from './plugin-optionsProvider'
import { CrxPluginFn } from './types'
import colors from 'picocolors'


/**
 * Check if a content script file should be built as IIFE based on its filename.
 * Files ending with .iife.ts, .iife.js, etc. are built as IIFE bundles.
 */
export function isIifeContentScript(file: string): boolean {
  return /\.iife\.(ts|tsx|js|jsx|mjs|cjs)$/.test(file)
}

/**
 * Builds content scripts as IIFE bundles using Vite's library mode.
 *
 * There are three ways to opt a content script into IIFE mode (self-contained
 * bundle with dependencies inlined, no ESM loader):
 *
 * 1. Filename convention: `foo.iife.ts` (or .iife.js etc.) — works for both
 *    manifest-declared content_scripts and dynamic `?script` imports.
 * 2. Query string: `import x from './foo?iife'` (or `?script&iife`, or just `?script`
 *    on a file that already matches (1) or (3)).
 * 3. Declarative config: list the file (relative to root) in
 *    `contentScripts: { standaloneFiles: ['src/foo.ts', ...] }` inside the crx()
 *    options in your Vite defineConfig (or via defineManifest style). Useful for
 *    MAIN world scripts without `.iife` in the filename.
 *
 * The IIFE plugin collects candidates from the manifest (after the manifest plugin
 * has skipped the normal emit for them) and from the contentScripts map (populated
 * by the dynamic scripts plugin for ?script cases). It then runs a secondary
 * Vite lib build (format: 'iife') for each and emits the result.
 *
 * We intentionally do *not* attempt to delete the intermediate ESM chunks that
 * the dynamic plugin emits for IIFE dynamic scripts. The final registration
 * always points at the IIFE artifact; the extra chunk is unreferenced and small.
 * This avoids fragile fileName/refId lookups, facadeModuleId scanning, and
 * complications when the same module is used both as IIFE and as a normal import
 * elsewhere. Manifest-declared IIFEs never produce an intermediate chunk because
 * plugin-manifest already skips them.
 *
 * Benefits of IIFE output:
 * - Single file (no code-splitting)
 * - All imports inlined (#region markers for origin)
 * - Works with chrome.scripting.executeScript({files}) and strict CSP
 * - No loader overhead at runtime
 *
 * Trade-offs:
 * - No sharing between scripts (larger total size)
 * - Extra build step per IIFE script
 */
export const pluginContentScriptsIife: CrxPluginFn = () => {
  const pluginName = 'crx:content-scripts-iife'

  let config: ResolvedConfig

  return [
    {
      name: `${pluginName}-config`,
      enforce: 'pre',
      configResolved(resolvedConfig) {
        config = resolvedConfig
      },
    },
    {
      name: pluginName,
      apply: 'build',
      enforce: 'post',
      async generateBundle(options, bundle) {
        const opts = await getOptions({ plugins: config.plugins } as UserConfig)
        const _manifest = opts.manifest
        const manifest =
          typeof _manifest === 'function'
            ? await _manifest({ command: 'build', mode: config.mode })
            : await Promise.resolve(_manifest)

        const standaloneFiles = (opts.contentScripts?.standaloneFiles || []).map((f: string) =>
          f.replace(/^\//, '')
        )
        const isStandaloneFile = (file: string) => {
          const normalized = file.replace(/^\//, '')
          return standaloneFiles.includes(normalized)
        }

        const iifeEntries: Array<{
          file: string
          id: string
          matches: string[]
          isDynamic?: boolean
        }> = []

        if (manifest.content_scripts) {
          for (const { js = [], matches = [] } of manifest.content_scripts) {
            for (const file of js) {
              if (isIifeContentScript(file) || isStandaloneFile(file)) {
                const id = join(config.root, file)
                iifeEntries.push({ file, id, matches })
              }
            }
          }
        }

        for (const [, script] of contentScripts.entries()) {
          if (script.type === 'iife' && script.isDynamicScript) {
            const id = join(config.root, script.id)
            if (!iifeEntries.some((e) => e.id === id)) {
              iifeEntries.push({
                file: script.id,
                id,
                matches: script.matches ?? [],
                isDynamic: true,
              })
            }
          }
        }

        if (iifeEntries.length === 0) return

        console.log(
          colors.cyan(`\n[${pluginName}] Building ${iifeEntries.length} content script(s) as IIFE...`),
        )

        // Build each content script as IIFE (see JSDoc for the three declaration modes
        // and the rationale for not removing intermediate ESM chunks for dynamic cases).
        for (const entry of iifeEntries) {
          const outputFileName = getIifeOutputPath(entry.file)

          try {
            const iifeConfig = createIifeConfig(config, entry.id, outputFileName)
            const result = await build(iifeConfig)

            // Handle both single and array results from Vite build
            // Skip if result is a watcher (shouldn't happen with write: false)
            if ('on' in result) {
              console.error(colors.red(`  Unexpected watcher result for ${entry.file}`))
              continue
            }
            
            const outputs = Array.isArray(result) 
              ? result.flatMap(r => 'output' in r ? r.output : [])
              : result.output
            
            // Add the IIFE output to the bundle
            for (const chunk of outputs) {
              if (chunk.type === 'chunk' && chunk.isEntry) {
                bundle[outputFileName] = {
                  ...chunk,
                  fileName: outputFileName,
                }

                // Update contentScripts map with new filename
                // For dynamic scripts, we need to update the existing entry
                const existingScript = contentScripts.get(entry.file)
                if (existingScript) {
                  // Update existing script entry with the IIFE filename
                  existingScript.fileName = outputFileName
                  contentScripts.set(entry.file, formatFileData(existingScript))
                } else {
                  // Create new entry for manifest-declared scripts
                  contentScripts.set(
                    entry.file,
                    formatFileData({
                      type: 'iife',
                      id: entry.file,
                      refId: entry.file,
                      matches: entry.matches,
                      fileName: outputFileName,
                    }),
                  )
                }
                
                console.log(
                  colors.green(`  ✓ ${basename(entry.file)} → ${outputFileName}`),
                )
              }
            }
          } catch (error) {
            console.error(
              colors.red(`  ✗ Failed to build ${entry.file}:`),
              error,
            )
            throw error
          }
        }

        console.log(colors.cyan(`[${pluginName}] IIFE build complete\n`))
      },
    },
  ]
}

/**
 * Get the output path for an IIFE content script.
 * Preserves directory structure but uses .js extension.
 */
function getIifeOutputPath(file: string): string {
  // Remove leading slash if present (dynamic scripts may have it)
  const normalizedFile = file.replace(/^\//, '')
  const dir = dirname(normalizedFile)
  const name = basename(normalizedFile).replace(/\.(ts|tsx|js|jsx|mjs|cjs)$/, '')
  return dir && dir !== '.' ? `${dir}/${name}.js` : `${name}.js`
}

/**
 * Create Vite config for building a single content script as IIFE.
 */
function createIifeConfig(
  parentConfig: ResolvedConfig,
  entryPath: string,
  outputFileName: string,
): InlineConfig {
  const entryName = basename(outputFileName, '.js')

  const baseConfig: InlineConfig = {
    // Inherit relevant settings from parent config
    root: parentConfig.root,
    mode: parentConfig.mode,
    resolve: parentConfig.resolve,
    define: parentConfig.define,
    esbuild: parentConfig.esbuild,
  }

  const iifeConfig: InlineConfig = {
    configFile: false,
    logLevel: 'warn',
    plugins: [],
    build: {
      write: false, // Don't write to disk, we'll add to bundle
      emptyOutDir: false,
      lib: {
        entry: entryPath,
        formats: ['iife'],
        name: safeVarName(entryName),
        fileName: () => outputFileName,
      },
      rollupOptions: {
        output: {
          entryFileNames: outputFileName,
          // Ensure all dependencies are inlined
          inlineDynamicImports: true,
        },
      },
      // Match parent config settings
      minify: parentConfig.build.minify,
      sourcemap: parentConfig.build.sourcemap,
      target: parentConfig.build.target,
    },
  }

  return mergeConfig(baseConfig, iifeConfig)
}

/**
 * Convert a string to a safe JavaScript variable name.
 */
function safeVarName(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9_$]/g, '_')
    .replace(/^(\d)/, '_$1')
    .replace(/^$/, '_')
}
