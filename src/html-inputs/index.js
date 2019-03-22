import path from 'path'
import fs from 'fs-extra'

import {
  getCssHrefs,
  getJsEntries,
  getJsAssets,
  loadHtml,
  getImgSrc,
} from './cheerio'
import { zipArrays } from '../helpers'

const name = 'html-inputs'

/* ------------- helper functions ------------- */

const not = fn => x => !fn(x)
const callWith = data => fn => fn(data)

const isHtml = path => /\.html?$/.test(path)

const resolveEntriesWith = htmlPaths => (jsSrcs, i) => {
  return jsSrcs.map(src =>
    path.join(path.dirname(htmlPaths[i]), src),
  )
}

/* ============================================ */
/*                  HTML-INPUTS                 */
/* ============================================ */

export default function htmlInputs() {
  /* -------------- hooks closures -------------- */
  let htmlData
  let htmlFiles
  let assets
  let srcDir
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

      htmlData = zipArrays(htmlPaths, html$)

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

      assets = Promise.all([
        htmlData.map(getJsAssets),
        htmlData.map(getImgSrc),
        htmlData.map(getCssHrefs),
      ]).then(([js, img, css]) => {
        js, img, css
      })

      assets = htmlData.map(data =>
        Promise.all(
          [getJsAssets, getImgSrc, getCssHrefs].map(
            callWith(data),
          ),
        ),
      )
    },

    async writeBundle() {
      const writeFile = dest => ([htmlPath, htmlSrc]) =>
        fs.writeFile(path.join(dest, htmlPath), htmlSrc)

      await Promise.all(htmlFiles.map(writeFile(destDir)))
    },
  }
}
