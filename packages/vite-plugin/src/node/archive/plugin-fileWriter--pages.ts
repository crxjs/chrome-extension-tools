import precontrollerScript from 'client/es/page-precontroller-script.ts'
import precontrollerHtml from 'client/html/precontroller.html'
import { htmlFiles } from '../helpers'
import { CrxPlugin, CrxPluginFn } from '../types'

export const pluginFileWriterPages: CrxPluginFn = () => {
  let precontrollerName: string | undefined

  return {
    name: 'crx:file-writer-pages',
    apply: 'build',
    // using configure server to co-locate related code
    configureServer(server) {
      const plugins = server.config.plugins as CrxPlugin[]
      const i = plugins.findIndex(({ name }) => name === 'alias')
      plugins.splice(i, 0, {
        name: 'crx:load-precontroller',
        apply: 'serve',
        load(id) {
          // if the placeholder html loads before the service worker controls fetch,
          // the script may load from the devserver; in this case the page should reload
          if (id === `/${precontrollerName}`) return 'location.reload();'
        },
      })
    },
    renderCrxManifest(manifest) {
      /**
       * We don't bundle HTML files during development b/c the background HMR
       * client to redirects all HTML requests to the dev server.
       *
       * Chrome checks that all the HTML pages in the manifest have files to
       * match, so we emit a stub HTML page. This page is never used.
       *
       * The only case where we use the stub page is if the background opens a
       * page immediately upon start. The background HMR client might not be
       * ready in those ~100ms after installation, so we use a simple script to
       * reload the stub page.
       */
      const refId = this.emitFile({
        type: 'asset',
        name: 'precontroller.js',
        source: precontrollerScript,
      })
      precontrollerName = this.getFileName(refId)
      for (const fileName of htmlFiles(manifest)) {
        this.emitFile({
          type: 'asset',
          fileName,
          source: precontrollerHtml.replace('%PATH%', `/${precontrollerName}`),
        })
      }
      return manifest
    },
  }
}
