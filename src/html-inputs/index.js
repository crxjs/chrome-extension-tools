import path from 'path'
import { getAssetPathMapFns, zipArrays } from '../helpers'
import {
  getJsEntries,
  loadHtml,
  mutateCssHrefs,
  mutateImgSrcs,
  mutateJsAssets,
  mutateJsEntries,
} from './cheerio'
import { isHtml, loadHtmlAssets, not } from './helpers'

const name = 'html-inputs'

/* ============================================ */
/*                  HTML-INPUTS                 */
/* ============================================ */

export default function htmlInputs() {
  /* -------------- hooks closures -------------- */

  const cache = {}

  // Assets will be a Promise
  let htmlAssets
  let jsEntries

  /* --------------- plugin object -------------- */
  return {
    name,

    /* ============================================ */
    /*                 OPTIONS HOOK                 */
    /* ============================================ */

    options(options) {
      // Skip if cache.input exists
      if (cache.input) {
        return {
          ...options,
          input: cache.input,
        }
      }

      // Cast options.input to array
      if (typeof options.input === 'string') {
        options.input = [options.input]
      }

      // Filter htm and html files
      cache.htmlPaths = options.input.filter(isHtml)

      // Skip if no html files
      if (!cache.htmlPaths.length) {
        htmlAssets = Promise.resolve([])
        return options
      }

      /* -------------- Load html files ------------- */

      const html$ = cache.htmlPaths.map(loadHtml)

      const htmlData = zipArrays(cache.htmlPaths, html$)

      // Start async load for html assets
      // NEXT: reload html assets on change
      htmlAssets = loadHtmlAssets(htmlData)

      // Get JS entry file names
      jsEntries = htmlData.flatMap(getJsEntries)

      // Cache jsEntries with existing options.input
      cache.input = options.input
        .filter(not(isHtml))
        .concat(jsEntries)

      return {
        ...options,
        input: cache.input,
      }
    },

    /* ============================================ */
    /*              HANDLE FILE CHANGES             */
    /* ============================================ */

    buildStart() {
      cache.htmlPaths.forEach((htmlPath) => {
        this.addWatchFile(htmlPath)
      })
    },

    watchChange(id) {
      if (id.endsWith('.html')) {
        cache.input = null
      }
    },

    /* ============================================ */
    /*                GENERATEBUNDLE                */
    /* ============================================ */

    async generateBundle(options, bundle) {
      // FIXME: relative paths within CSS files will fail
      // NEXT: use postcss to process CSS asset src
      await Promise.all(
        (await htmlAssets).map(
          async ([htmlPath, $, { js, img, css }]) => {
            const htmlName = path.basename(htmlPath)

            // Setup file path mapping fns
            const jsFns = await getAssetPathMapFns.call(this, js)
            const imgFns = await getAssetPathMapFns.call(
              this,
              img,
            )
            const cssFns = await getAssetPathMapFns.call(
              this,
              css,
            )

            // Update html file with new
            // script and asset file paths
            mutateJsEntries($)
            jsFns.reduce(mutateJsAssets, $)
            cssFns.reduce(mutateCssHrefs, $)
            imgFns.reduce(mutateImgSrcs, $)

            // Add custom asset to bundle
            bundle[htmlName] = {
              fileName: htmlName,
              isAsset: true,
              source: $.html(),
            }
          },
        ),
      )
    },
  }
}
