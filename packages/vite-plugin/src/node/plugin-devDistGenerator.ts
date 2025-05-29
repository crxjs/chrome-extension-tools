import { promises as fs } from 'fs'
import { dirname, join, resolve } from 'path'
import { ResolvedConfig, ViteDevServer } from 'vite'
import { ChromeManifestBackground, ManifestV3 } from './manifest'
import { CrxPluginFn } from './types'

async function ensureDir(dir: string) {
  try {
    await fs.mkdir(dir, { recursive: true })
  } catch (e) {
    // ignore if exists
  }
}

async function generateLoaderFile(
  scriptPath: string,
  port: number,
  includeHmrClient = true,
  isContentScript = false,
): Promise<string> {
  if (isContentScript) {
    // Content scripts can't use ES modules, so we need to inject a script tag
    const scripts: string[] = []
    if (includeHmrClient) {
      scripts.push(`http://localhost:${port}/@vite/client`)
    }
    scripts.push(`http://localhost:${port}/${scriptPath}`)

    return `(function() {
  ${scripts
    .map(
      (src, index) => `
  const script${index} = document.createElement('script');
  script${index}.type = 'module';
  script${index}.src = '${src}';
  (document.head || document.documentElement).appendChild(script${index});
  `,
    )
    .join('')}
})();
`
  }

  // For service workers, use ES module imports
  const imports = []
  if (includeHmrClient) {
    imports.push(`import 'http://localhost:${port}/@vite/client'`)
  }
  imports.push(`import 'http://localhost:${port}/${scriptPath}'`)
  return imports.join('\n') + '\n'
}

async function generateHtmlFile(
  htmlPath: string,
  port: number,
  scriptPath: string,
): Promise<string> {
  // Read the original HTML file
  const originalHtml = await fs.readFile(htmlPath, 'utf-8')

  // Replace script src with localhost URL
  const modifiedHtml = originalHtml.replace(
    /<script\s+(?:type="module"\s+)?src="[^"]+"/g,
    `<script type="module" src="http://localhost:${port}/${scriptPath}"`,
  )

  return modifiedHtml
}

async function generateDevDist(
  manifest: ManifestV3,
  server: ViteDevServer,
  rootDir: string,
) {
  const port = server.config.server.port || 5173
  const distDir = join(rootDir, 'dist')

  // Ensure dist directory exists
  await ensureDir(distDir)

  // Generate service worker loader
  if (manifest.background && 'service_worker' in manifest.background) {
    const background = manifest.background as ChromeManifestBackground
    const loaderPath = join(distDir, 'service-worker-loader.js')
    const loaderContent = await generateLoaderFile(
      background.service_worker,
      port,
      false, // Service workers don't need HMR client
    )
    await fs.writeFile(loaderPath, loaderContent)
  }

  // Generate content script loaders
  if (manifest.content_scripts) {
    for (let i = 0; i < manifest.content_scripts.length; i++) {
      const contentScript = manifest.content_scripts[i]
      if (contentScript.js) {
        for (let j = 0; j < contentScript.js.length; j++) {
          const scriptPath = contentScript.js[j]
          const loaderName = `content-loader-${i}-${j}.js`
          const loaderPath = join(distDir, loaderName)
          const loaderContent = await generateLoaderFile(
            scriptPath,
            port,
            true,
            true,
          )
          await fs.writeFile(loaderPath, loaderContent)

          // Update the manifest to point to the loader
          contentScript.js[j] = loaderName
        }
      }
    }
  }

  // Generate HTML files
  const htmlFiles: string[] = []
  if (manifest.action?.default_popup) {
    htmlFiles.push(manifest.action.default_popup)
  }
  if (manifest.options_page) {
    htmlFiles.push(manifest.options_page)
  }
  if (manifest.options_ui?.page) {
    htmlFiles.push(manifest.options_ui.page)
  }
  if (manifest.devtools_page) {
    htmlFiles.push(manifest.devtools_page)
  }

  for (const htmlFile of htmlFiles) {
    const htmlPath = join(rootDir, htmlFile)
    const distHtmlPath = join(distDir, htmlFile)

    // Ensure directory exists
    await ensureDir(dirname(distHtmlPath))

    // Generate HTML with localhost script
    const scriptPath = htmlFile.replace('.html', '.ts')
    const htmlContent = await generateHtmlFile(htmlPath, port, scriptPath)
    await fs.writeFile(distHtmlPath, htmlContent)
  }

  // Transform manifest for dev mode
  const devManifest = JSON.parse(JSON.stringify(manifest)) as ManifestV3

  // Update background service worker
  if (devManifest.background && 'service_worker' in devManifest.background) {
    ;(devManifest.background as ChromeManifestBackground).service_worker =
      'service-worker-loader.js'
  }

  // CSP is already handled by plugin-manifest.ts for dev mode

  // Write manifest
  const manifestPath = join(distDir, 'manifest.json')
  await fs.writeFile(manifestPath, JSON.stringify(devManifest, null, 2))

  console.log(`[crx] Dev dist generated at ${distDir}`)
}

export const pluginDevDistGenerator: CrxPluginFn = () => {
  let config: ResolvedConfig
  let manifest: ManifestV3

  return {
    name: 'crx:dev-dist-generator',
    apply: 'serve',
    enforce: 'post',

    async config(userConfig, env) {
      const { getOptions } = await import('./plugin-optionsProvider')
      const { manifest: _manifest } = await getOptions(userConfig)
      manifest = await (typeof _manifest === 'function'
        ? _manifest(env)
        : _manifest)
    },

    configResolved(_config) {
      config = _config
    },

    configureServer(server) {
      // Generate dist on server start
      server.httpServer?.once('listening', async () => {
        try {
          await generateDevDist(manifest, server, config.root)
        } catch (error) {
          console.error('[crx] Failed to generate dev dist:', error)
        }
      })

      // Watch manifest for changes
      const manifestPath = resolve(config.root, 'manifest.json')
      server.watcher.add(manifestPath)

      server.watcher.on('change', async (file) => {
        if (file === manifestPath) {
          console.log('[crx] Manifest changed, regenerating dev dist...')
          try {
            // Re-read manifest
            const manifestContent = await fs.readFile(manifestPath, 'utf-8')
            manifest = JSON.parse(manifestContent)
            await generateDevDist(manifest, server, config.root)
          } catch (error) {
            console.error('[crx] Failed to regenerate dev dist:', error)
          }
        }
      })

      // Send reload message when files change
      server.ws.on('connection', () => {
        server.watcher.on('change', (file) => {
          if (file.endsWith('.ts') || file.endsWith('.js')) {
            server.ws.send({
              type: 'custom',
              event: 'crx:runtime-reload',
            })
          }
        })
      })
    },
  }
}
