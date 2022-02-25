import preControllerScript from 'client/es/page-precontroller-script.ts?client'
import preControllerHtml from 'client/html/precontroller.html?client'
import { htmlFiles } from './helpers'
import { CrxPluginFn } from './types'

export const pluginFileWriterHtml: CrxPluginFn = () => {
  return {
    name: 'crx:file-writer-html',
    apply: 'build',
    renderCrxManifest(manifest) {
      if (this.meta.watchMode) {
        /**
         * We don't bundle HTML files during development b/c the background HMR
         * client to redirects all HTML requests to the dev server.
         *
         * Chrome checks that all the HTML pages in the manifest have files to
         * match, so we emit a stub HTML page. This page is never used.
         *
         * The only case where we use the stub page is if the background opens a
         * page immediately upon start. The background HMR client might not be
         * ready in those ~100ms after installation, so we use a simple script
         * to reload the stub page.
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
  }
}
