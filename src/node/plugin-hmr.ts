import contentHmrClient from 'client/es/content-hmr-client.ts?client'
import workerHmrClient from 'client/es/worker-hmr-client.ts?client'
import { ModuleNode, ResolvedConfig } from 'vite'
import { defineClientValues } from './defineClientValues'
import { join } from './path'
import type { CrxPluginFn } from './types'

// const debug = _debug('hmr')

/** Determine if a file was imported by a module or a parent module */
function isImporter(file: string) {
  const pred = (node: ModuleNode) => {
    if (node.file === file) return true
    for (const node2 of node.importers) if (pred(node2)) return true
  }
  return pred
}

export const workerClientId = '@crx/client/worker'
export const contentClientId = '@crx/client/content'

// TODO: emit new files for each content script module.
// TODO: add fetch handler to service worker
export const pluginHMR: CrxPluginFn = () => {
  let config: ResolvedConfig
  let background: string | undefined

  return [
    {
      name: 'crx:hmr-background',
      apply: 'build',
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
        if (source === `/${workerClientId}`) return workerClientId
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
      name: 'crx:hmr-content-scripts',
      apply: 'build',
      enforce: 'pre',
      resolveId(source) {
        if (source === contentClientId || source === '/@vite/client')
          return `\0${contentClientId}`
      },
      load(id) {
        if (id === `\0${contentClientId}`)
          return defineClientValues(contentHmrClient, config)
      },
      renderChunk(code, { fileName }) {
        // make this
        // import.meta.hot = createHotContext("/src/App.jsx")
        // into this
        // import.meta.hot = createHotContext("/${fileName}")
      },
    },
    {
      name: 'crx:hmr-content-scripts',
      apply: 'serve',
      enforce: 'pre',
      handleHotUpdate() {
        /**
         * Handle HMR updates for outDir files
         *
         * Send mapped HMR events from source files to output files
         *
         * - Explore update & prune
         * - What about full-reload?
         */
      },
    },
  ]
}
