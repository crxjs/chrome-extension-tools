import { promises as fs } from 'fs'
import { dirname, join, relative, resolve } from 'path'
import { ResolvedConfig, ViteDevServer } from 'vite'
import { CrxPluginFn } from './types'
import { ManifestV3 } from './manifest'

interface ContentScriptFile {
  originalPath: string
  devPath: string
  loaderPath: string
}

/**
 * Clean, robust content script HMR implementation
 *
 * This plugin handles content script development by:
 *
 * 1. Writing transpiled content scripts to disk (required by Chrome's security
 *    model)
 * 2. Creating small loader files that use dynamic imports
 * 3. Using WebSocket only for reload signaling
 * 4. Maintaining a clean separation of concerns
 */
export const pluginContentScriptHMR: CrxPluginFn = () => {
  let config: ResolvedConfig
  let server: ViteDevServer
  let manifest: ManifestV3
  const contentScriptMap = new Map<string, ContentScriptFile>()

  // Ensure directory exists
  async function ensureDir(dir: string) {
    try {
      await fs.mkdir(dir, { recursive: true })
    } catch (e) {
      // Ignore if exists
    }
  }

  // Generate a loader file that uses dynamic import
  function generateLoaderContent(devScriptPath: string): string {
    // Use relative path for the dynamic import
    return `// Auto-generated loader for HMR
(() => {
  // Dynamic import allows Chrome to load the transpiled content script
  import('./${devScriptPath}').catch(err => {
    console.error('[CRXJS] Failed to load content script:', err);
  });
})();
`
  }

  // Write a file safely with directory creation
  async function safeWriteFile(filePath: string, content: string) {
    await ensureDir(dirname(filePath))
    await fs.writeFile(filePath, content, 'utf-8')
  }

  // Process content scripts from manifest
  async function processContentScripts() {
    if (!manifest.content_scripts) return

    const distDir = join(config.root, 'dist')
    contentScriptMap.clear()

    for (let i = 0; i < manifest.content_scripts.length; i++) {
      const contentScript = manifest.content_scripts[i]
      if (!contentScript.js) continue

      for (let j = 0; j < contentScript.js.length; j++) {
        const scriptPath = contentScript.js[j]
        const originalPath = resolve(config.root, scriptPath)

        // Create paths for dev files
        const scriptName = scriptPath.replace(/\.(ts|js)$/, '')
        const devFileName = `${scriptName}-dev.js`
        const loaderFileName = `${scriptName}-loader.js`

        const devPath = join(distDir, devFileName)
        const loaderPath = join(distDir, loaderFileName)

        // Store mapping
        contentScriptMap.set(originalPath, {
          originalPath,
          devPath,
          loaderPath,
        })

        // Update manifest to point to loader
        contentScript.js[j] = relative(config.root, loaderPath)
      }
    }
  }

  // Build and write content script
  async function buildContentScript(filePath: string) {
    const fileInfo = contentScriptMap.get(filePath)
    if (!fileInfo) return

    try {
      // Transform the file using Vite
      const result = await server.transformRequest(filePath)
      if (!result || !result.code) return

      // Inject HMR client import at the top of the content script
      const codeWithHMR = `import '@crxjs/vite-plugin/client/es/content-hmr-client.js';\n${result.code}`

      // Write the transpiled code
      await safeWriteFile(fileInfo.devPath, codeWithHMR)

      // Write the loader that imports the dev file
      const devFileName = relative(
        dirname(fileInfo.loaderPath),
        fileInfo.devPath,
      )
      const loaderContent = generateLoaderContent(devFileName)
      await safeWriteFile(fileInfo.loaderPath, loaderContent)

      console.log(
        `[crx:content-script-hmr] Updated ${relative(config.root, filePath)}`,
      )
    } catch (error) {
      console.error(
        `[crx:content-script-hmr] Failed to build ${filePath}:`,
        error,
      )
    }
  }

  // Build all content scripts
  async function buildAllContentScripts() {
    for (const [filePath] of contentScriptMap) {
      await buildContentScript(filePath)
    }
  }

  // Write updated manifest
  async function writeManifest() {
    const distDir = join(config.root, 'dist')
    const manifestPath = join(distDir, 'manifest.json')
    await safeWriteFile(manifestPath, JSON.stringify(manifest, null, 2))
  }

  return {
    name: 'crx:content-script-hmr',
    apply: 'serve',
    enforce: 'post',

    async config(userConfig, env) {
      // Get manifest from options provider
      const { getOptions } = await import('./plugin-optionsProvider')
      const { manifest: _manifest } = await getOptions(userConfig)
      manifest = await (typeof _manifest === 'function'
        ? _manifest(env)
        : _manifest)
    },

    configResolved(_config) {
      config = _config
    },

    async configureServer(_server) {
      server = _server

      // Initial setup when server starts
      server.httpServer?.once('listening', async () => {
        try {
          await processContentScripts()
          await buildAllContentScripts()
          await writeManifest()
          console.log(
            '[crx:content-script-hmr] Content scripts ready for development',
          )
        } catch (error) {
          console.error('[crx:content-script-hmr] Failed to initialize:', error)
        }
      })

      // Watch for content script changes
      server.watcher.on('change', async (file) => {
        const filePath = resolve(file)

        // Check if this is a content script
        if (contentScriptMap.has(filePath)) {
          await buildContentScript(filePath)

          // Send reload signal via WebSocket
          server.ws.send({
            type: 'custom',
            event: 'crx:content-script-update',
            data: { file: relative(config.root, filePath) },
          })
        }
      })

      // Watch manifest for changes
      const manifestPath = resolve(config.root, 'manifest.json')
      server.watcher.add(manifestPath)

      server.watcher.on('change', async (file) => {
        if (file === manifestPath) {
          console.log(
            '[crx:content-script-hmr] Manifest changed, rebuilding...',
          )
          try {
            // Re-read manifest
            const manifestContent = await fs.readFile(manifestPath, 'utf-8')
            manifest = JSON.parse(manifestContent)

            // Reprocess everything
            await processContentScripts()
            await buildAllContentScripts()
            await writeManifest()

            // Signal full reload
            server.ws.send({
              type: 'custom',
              event: 'crx:runtime-reload',
            })
          } catch (error) {
            console.error(
              '[crx:content-script-hmr] Failed to process manifest:',
              error,
            )
          }
        }
      })
    },

    // Clean up dist directory on close
    async closeBundle() {
      if (server) {
        const distDir = join(config.root, 'dist')
        try {
          await fs.rm(distDir, { recursive: true, force: true })
        } catch (error) {
          // Ignore errors during cleanup
        }
      }
    },
  }
}
