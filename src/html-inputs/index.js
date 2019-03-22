import {
  getCssHrefs,
  getJsEntries,
  getJsAssets,
  loadHtml,
  getImgSrcs,
  mutateJsAssets,
  mutateCssHrefs,
  mutateImgSrcs,
} from './cheerio'

import {
  zipArrays,
  loadAssetData,
  getAssetPathMapFns,
  writeFile,
} from '../helpers'

const name = 'html-inputs'

/* ------------- helper functions ------------- */

const not = fn => x => !fn(x)

const isHtml = path => /\.html?$/.test(path)

const loadHtmlAssets = htmlData =>
  Promise.all(
    htmlData.map(async data =>
      data.concat({
        js: await Promise.all(
          getJsAssets(data).map(loadAssetData),
        ),
        img: await Promise.all(
          getImgSrcs(data).map(loadAssetData),
        ),
        css: await Promise.all(
          getCssHrefs(data).map(loadAssetData),
        ),
      }),
    ),
  )

/* ============================================ */
/*                  HTML-INPUTS                 */
/* ============================================ */

export default function htmlInputs() {
  /* -------------- hooks closures -------------- */

  // Assets will be a Promise
  let htmlAssets
  let htmlFiles
  let destDir

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
      const jsEntries = htmlData.flatMap(getJsEntries)

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

    async generateBundle({ dir }) {
      destDir = dir

      // CONCERN: relative paths within CSS files will fail
      // SOLUTION: use postcss to process CSS asset src
      //   Probably inline images here
      htmlFiles = await Promise.all(
        (await htmlAssets).map(
          async ([htmlPath, $, { js, img, css }]) => {
            const jsFns = await getAssetPathMapFns.call(this, js)
            const imgFns = await getAssetPathMapFns.call(
              this,
              img,
            )
            const cssFns = await getAssetPathMapFns.call(
              this,
              css,
            )

            jsFns.reduce(mutateJsAssets, $)
            cssFns.reduce(mutateCssHrefs, $)
            imgFns.reduce(mutateImgSrcs, $)

            return [htmlPath, $.html()]
          },
        ),
      )
    },

    async writeBundle() {
      await Promise.all(htmlFiles.map(writeFile(destDir)))
    },
  }
}
