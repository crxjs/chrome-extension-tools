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

export default function htmlInputs({ mapFileNames = x => x }) {
  /* -------------- hooks closures -------------- */

  // Assets will be a Promise
  let htmlAssets

  /* --------------- plugin object -------------- */
  return {
    name,

    /* ============================================ */
    /*                 OPTIONS HOOK                 */
    /* ============================================ */

    options({ input, ...inputOptions }) {
      // Filter htm and html files
      const htmlPaths = input.filter(isHtml)

      // Load html files
      const html$ = htmlPaths.map(loadHtml)

      const htmlData = zipArrays(htmlPaths, html$)
      htmlAssets = loadHtmlAssets(htmlData)

      // Get JS entry file names
      const jsEntries = htmlData
        .flatMap(getJsEntries)
        .map(mapFileNames)

      // Return new input options
      const inputs = input.filter(not(isHtml))

      return {
        ...inputOptions,
        input: inputs.concat(jsEntries),
      }
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

            jsFns.reduce(mutateJsEntries(mapFileNames), $)
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
