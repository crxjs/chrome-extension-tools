import { build, mergeConfig, InlineConfig, ResolvedConfig, UserConfig } from 'vite'
import { contentScripts } from './contentScripts'
import { formatFileData } from './fileWriter-utilities'
import { basename, dirname, join } from './path'
import { getOptions } from './plugin-optionsProvider'
import { CrxPluginFn } from './types'
import colors from 'picocolors'

/**
 * Builds content scripts as IIFE bundles using Vite's library mode.
 *
 * When `contentScripts.iife` is enabled, content scripts are built separately
 * as self-contained IIFE bundles with all dependencies inlined.
 *
 * Benefits:
 * - Single file output per content script (no code-splitting)
 * - All imports inlined with #region comments showing module origins
 * - No dynamic imports or external dependencies
 * - Faster content script execution (no loader overhead)
 *
 * Trade-offs:
 * - No code sharing between content scripts (larger total bundle size)
 * - Separate build step for each content script
 */
/**
 * Check if a content script file should be built as IIFE based on its filename.
 * Files ending with .iife.ts, .iife.js, etc. are built as IIFE bundles.
 */
export function isIifeContentScript(file: string): boolean {
  return /\.iife\.(ts|tsx|js|jsx|mjs|cjs)$/.test(file)
}

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

        // Collect IIFE content scripts from two sources:
        // 1. Manifest content_scripts with .iife.ts files
        // 2. Dynamic scripts (via ?script import) with .iife.ts files
        const iifeEntries: Array<{
          file: string
          id: string
          matches: string[]
          isDynamic?: boolean
        }> = []

        // From manifest
        if (manifest.content_scripts) {
          for (const { js = [], matches = [] } of manifest.content_scripts) {
            for (const file of js) {
              if (isIifeContentScript(file)) {
                const id = join(config.root, file)
                iifeEntries.push({ file, id, matches })
              }
            }
          }
        }

        // From dynamic scripts (contentScripts map)
        for (const [key, script] of contentScripts.entries()) {
          if (script.type === 'iife' && script.isDynamicScript) {
            const id = join(config.root, script.id)
            // Avoid duplicates
            if (!iifeEntries.some(e => e.id === id)) {
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

        // Remove the module-based content script chunks from the bundle
        // They will be replaced by IIFE builds
        for (const entry of iifeEntries) {
          const script = contentScripts.get(entry.file)
          if (script?.fileName && bundle[script.fileName]) {
            // Also remove any chunks that were only used by this content script
            const chunk = bundle[script.fileName]
            if (chunk.type === 'chunk') {
              // Remove the main chunk
              delete bundle[script.fileName]
              // Remove associated loader if present
              if (script.loaderName && bundle[script.loaderName]) {
                delete bundle[script.loaderName]
              }
            }
          }
        }

        // Build each content script as IIFE
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
