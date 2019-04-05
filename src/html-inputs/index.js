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

  // Assets will be a Promise
  let htmlAssets
  let jsEntries

  /* --------------- plugin object -------------- */
  return {
    name,

    /* ============================================ */
    /*                 OPTIONS HOOK                 */
    /* ============================================ */

    // TODO: use buildStart hook??
    options(options) {
      if (typeof options.input === 'string') {
        options.input = [options.input]
      }

      // Filter htm and html files
      const htmlPaths = options.input.filter(isHtml)

      if (!htmlPaths.length) return options

      // Load html files
      const html$ = htmlPaths.map(loadHtml)

      const htmlData = zipArrays(htmlPaths, html$)
      htmlAssets = loadHtmlAssets(htmlData)

      // Get JS entry file names
      jsEntries = htmlData.flatMap(getJsEntries)

      // Return new input options
      const inputs = options.input.filter(not(isHtml))

      const result = {
        ...options,
        input: inputs.concat(jsEntries),
      }

      // html options hook
      return result
    },

    /* ============================================ */
    /*                GENERATEBUNDLE                */
    /* ============================================ */

    async generateBundle(options, bundle) {
      // CONCERN: relative paths within CSS files will fail
      // SOLUTION: use postcss to process CSS asset src
      //   Probably inline images here
      await Promise.all(
        (await htmlAssets).map(
          async ([htmlPath, $, { js, img, css }]) => {
            const htmlName = path.basename(htmlPath)

            const jsFns = await getAssetPathMapFns.call(this, js)
            const imgFns = await getAssetPathMapFns.call(
              this,
              img,
            )
            const cssFns = await getAssetPathMapFns.call(
              this,
              css,
            )

            mutateJsEntries($)
            jsFns.reduce(mutateJsAssets, $)
            cssFns.reduce(mutateCssHrefs, $)
            imgFns.reduce(mutateImgSrcs, $)

            // Mutate bundle to emit custom asset
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
