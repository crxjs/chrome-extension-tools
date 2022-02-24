import contentHmrClient from 'client/es/content-hmr-client.ts?client'
import preControllerScript from 'client/es/page-precontroller-script.ts?client'
import workerHmrClient from 'client/es/worker-hmr-client.ts?client'
import preControllerHtml from 'client/html/precontroller.html?client'
import { ModuleNode, ResolvedConfig } from 'vite'
import { defineClientValues } from './defineClientValues'
import { htmlFiles } from './helpers'
import { join } from './path'
import type { CrxPluginFn } from './types'

// const debug = _debug('crx:hmr')

/** Determine if a file was imported by a module or a parent module */
function isImporter(file: string) {
  const pred = (node: ModuleNode) => {
    if (node.file === file) return true
    for (const node2 of node.importers) if (pred(node2)) return true
  }
  return pred
}

const workerClientId = '@crx/client/worker'
const contentClientId = '@crx/client/content'

// TODO: emit new files for each content script module.
// TODO: add fetch handler to service worker
export const pluginHMR: CrxPluginFn = () => {
  let config: ResolvedConfig
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
      enforce: 'pre',
      resolveId(source) {
        if (source === contentClientId) return `\0${contentClientId}`
      },
      load(id) {
        if (id === `\0${contentClientId}`)
          return defineClientValues(contentHmrClient, config)
      },
    },
  ]
}
