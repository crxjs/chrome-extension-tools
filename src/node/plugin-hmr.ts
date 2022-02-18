import preControllerScript from 'client/es/page-precontroller-script.ts?client'
import workerHmrClient from 'client/es/worker-hmr-client.ts?client'
import preControllerHtml from 'client/html/precontroller.html?client'
import colors from 'picocolors'
import { skip } from 'rxjs'
import type { ModuleNode, ResolvedConfig, ViteDevServer } from 'vite'
import { htmlFiles, isObject } from './helpers'
import { join, normalize, relative } from './path'
import { filesReady$, filesStart$ } from './plugin-fileWriter'
import type { CrxPluginFn } from './types'

// const debug = _debug('crx:hmr')

const workerClientId = '/@crx/worker-client'

function isImporter(file: string) {
  const pred = (node: ModuleNode) => {
    if (node.file === file) return true
    for (const node2 of node.importers) if (pred(node2)) return true
  }
  return pred
}

function setupHmrEvents(server: ViteDevServer) {
  const brand = colors.cyan(colors.bold('[crx]'))

  filesStart$.subscribe(() => {
    const time = colors.dim(new Date().toLocaleTimeString())
    const message = colors.green('files start')
    const outDir = colors.dim(
      relative(server.config.root, server.config.build.outDir),
    )
    console.log(`${time} ${brand} ${message} ${outDir}`)
  })

  filesReady$.subscribe(({ duration: d }) => {
    const time = colors.dim(new Date().toLocaleTimeString())
    const message = colors.green('files ready')
    const duration = colors.dim(`in ${colors.bold(`${d}ms`)}`)
    console.log(`${time} ${brand} ${message} ${duration}`)
  })

  filesReady$.pipe(skip(1)).subscribe(() => {
    const time = colors.dim(new Date().toLocaleTimeString())
    const message = colors.green('runtime reload')
    console.log(`${time} ${brand} ${message}`)
  })

  filesReady$.subscribe(() => {
    server.ws.send({
      type: 'custom',
      event: 'runtime-reload',
    })
  })
}

// TODO: emit new files for each content script module.
// TODO: add fetch handler to service worker
export const pluginHMR: CrxPluginFn = () => {
  let config: ResolvedConfig
  /** Provided by crx: */
  let background: string | undefined

  return [
    {
      name: 'crx:hmr-background',
      apply: 'build',
      configResolved(_config) {
        config = config ?? (_config as ResolvedConfig)
      },
      renderCrxManifest(manifest) {
        if (this.meta.watchMode && manifest.background?.service_worker)
          background = join(config.root, manifest.background?.service_worker)
        return null
      },
    },
    {
      name: 'crx:hmr-background',
      apply: 'serve',
      config({ server = {}, ...config }) {
        if (server.hmr === false) return
        if (server.hmr === true) server.hmr = {}
        server.hmr = server.hmr ?? {}
        server.hmr.host = 'localhost'

        return { server, ...config }
      },
      configResolved(_config) {
        config = _config as ResolvedConfig
      },
      configureServer(server) {
        setupHmrEvents(server)
      },
      resolveId(source) {
        if (source === workerClientId) return workerClientId
      },
      load(id) {
        if (id === workerClientId)
          return defineClientValues(workerHmrClient, config)
      },
      handleHotUpdate({ server, modules, file }) {
        if (background)
          if (background === file || modules.some(isImporter(background))) {
            server.ws.send({
              type: 'custom',
              event: 'runtime-reload',
            })
            return []
          }
      },
    },
    {
      name: 'crx:hmr-pages',
      apply: 'build',
      renderCrxManifest(manifest) {
        if (this.meta.watchMode) {
          /**
           * We don't bundle HTML files during development b/c the background
           * HMR client to redirects all HTML requests to the dev server.
           *
           * Chrome checks that all the HTML pages in the manifest have files to
           * match, so we emit a stub HTML page. This page is never used.
           *
           * The only case where we use the stub page is if the background opens
           * a page immediately upon start. The background HMR client might not
           * be ready in those ~100ms after installation, so we use a simple
           * script to reload the stub page.
           */
          const refId = this.emitFile({
            type: 'asset',
            name: 'precontroller.js',
            source: preControllerScript,
          })
          const name = this.getFileName(refId)
          for (const fileName of htmlFiles(manifest)) {
            this.emitFile({
              type: 'asset',
              fileName,
              source: preControllerHtml.replace('%PATH%', `/${name}`),
            })
          }
        }
        return manifest
      },
    },
    {
      name: 'crx:hmr-content-scripts',
      apply: 'build',
      // TODO: emit new files for each content script module, use real file names
      // TODO: add message-based content script HMR client
      // TODO: send content script HMR updates to background via HMR websocket
    },
  ]
}

export function defineClientValues(code: string, config: ResolvedConfig) {
  let options = config.server.hmr
  options = options && typeof options !== 'boolean' ? options : {}
  const host = options.host || null
  const protocol = options.protocol || null
  const timeout = options.timeout || 30000
  const overlay = options.overlay !== false
  let hmrPort: number | string | undefined
  if (isObject(config.server.hmr)) {
    hmrPort = config.server.hmr.clientPort || config.server.hmr.port
  }
  if (config.server.middlewareMode) {
    hmrPort = String(hmrPort || 24678)
  } else {
    hmrPort = String(hmrPort || options.port || config.server.port!)
  }
  let hmrBase = config.base
  if (options.path) {
    hmrBase = join(hmrBase, options.path)
  }
  if (hmrBase !== '/') {
    hmrPort = normalize(`${hmrPort}${hmrBase}`)
  }

  return code
    .replace(`__MODE__`, JSON.stringify(config.mode))
    .replace(`__BASE__`, JSON.stringify(config.base))
    .replace(`__DEFINES__`, serializeDefine(config.define || {}))
    .replace(`__HMR_PROTOCOL__`, JSON.stringify(protocol))
    .replace(`__HMR_HOSTNAME__`, JSON.stringify(host))
    .replace(`__HMR_PORT__`, JSON.stringify(hmrPort))
    .replace(`__HMR_TIMEOUT__`, JSON.stringify(timeout))
    .replace(`__HMR_ENABLE_OVERLAY__`, JSON.stringify(overlay))
    .replace(`__SERVER_PORT__`, JSON.stringify(config.server.port?.toString()))

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function serializeDefine(define: Record<string, any>): string {
    let res = `{`
    for (const key in define) {
      const val = define[key]
      res += `${JSON.stringify(key)}: ${
        typeof val === 'string' ? `(${val})` : JSON.stringify(val)
      }, `
    }
    return res + `}`
  }
}
