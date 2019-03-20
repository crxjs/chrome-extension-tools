import path from 'path'
import fs from 'fs-extra'

import { deriveEntries } from '@bumble/manifest-entry-points'

import { getCssLinks, getScriptTags, loadHtml } from './cheerio'
import { extendWriteFile } from './extend-fs'

/* ---- predicate object for deriveEntries ---- */
const predObj = {
  js: s => /\.js$/.test(s),
  css: s => /\.css$/.test(s),
  html: s => /\.html$/.test(s),
  img: s => /\.png$/.test(s),
  filter: v =>
    typeof v === 'string' &&
    v.includes('.') &&
    !v.includes('*') &&
    !/^https?:/.test(v),
}

/* ------------- helper functions ------------- */

const transformLinksWith = htmlFilePaths => (links, i) => {
  const dirname = path.dirname(htmlFilePaths[i])
  const newLinks = links.map(link => path.join(dirname, link))

  return newLinks
}

const readFiles = assets =>
  Promise.all(assets.map(asset => fs.readFile(asset)))

export default function(
  { copyManifest } = { copyManifest: true },
) {
  /* -------------- hooks closures -------------- */
  let srcDirname = null
  const assetPaths = {
    css: [],
    img: [],
    html: [],
    html$: [],
    manifest: [],
  }
  const assetSrcs = { css: [], img: [], html: [], manifest: {} }

  /**
   * assetFileNameMap
   * @example
   * const outputOptions = {
   *   assetFileNameMap: {
   *     [hashedAssetPath]: [assetPath]
   *   }
   * }
   */
  const assetFileNameMap = {}

  extendWriteFile(
    assetPath => assetFileNameMap[assetPath] || assetPath,
  )

  /* --------------- plugin object -------------- */
  return {
    name: 'manifest-input',

    /* ============================================ */
    /*                 OPTIONS HOOK                 */
    /* ============================================ */

    options({ input: manifestPath, ...inputOptions }) {
      // Check that input is manifest
      if (path.basename(manifestPath) !== 'manifest.json')
        throw new TypeError(
          'plugin error: input is not manifest.json',
        )

      // Load manifest.json
      const manifest = fs.readJSONSync(manifestPath)

      // Get web extension directory path
      const dirname = path.dirname(manifestPath)
      srcDirname = dirname

      // Derive entry paths from manifest
      const { js, css, html, img } = deriveEntries(manifest, {
        ...predObj,
        transform: name => path.join(dirname, name),
      })

      // Extract links from html files
      // and transform to relative paths
      const html$ = html.map(loadHtml)

      const transformLinks = transformLinksWith(html)

      const cssLinks = html$
        .map(getCssLinks)
        .flatMap(transformLinks)

      const jsScripts = html$
        .map(getScriptTags)
        .flatMap(transformLinks)

      // Assign asset paths
      assetPaths.css = css.concat(cssLinks)
      assetPaths.img = img
      assetPaths.html = html
      assetPaths.html$ = html$

      // Save manifest data
      assetPaths.manifest = [manifestPath]
      assetSrcs.manifest = [JSON.stringify(manifest)]

      // Return new input options
      return {
        ...inputOptions,
        input: js.concat(jsScripts),
      }
    },

    async buildStart() {
      // Assign asset srcs
      const [cssSrc, imgSrc, htmlSrc] = await Promise.all([
        readFiles(assetPaths.css),
        readFiles(assetPaths.img),
        assetPaths.html$.map($ => $.html()),
      ])

      assetSrcs.css = cssSrc
      assetSrcs.img = imgSrc
      assetSrcs.html = htmlSrc
    },

    /* ============================================ */
    /*                GENERATEBUNDLE                */
    /* ============================================ */

    generateBundle({ dir }) {
      const emitAssetWith = srcArray => (
        relativeAssetPath,
        i,
      ) => {
        const baseName = path.basename(relativeAssetPath)

        const id = this.emitAsset(baseName, srcArray[i])

        const hashedPath = this.getAssetFileName(id)
        const hashedFilePath = path.resolve(dir, hashedPath)

        const desiredFileName = relativeAssetPath.replace(
          srcDirname,
          dir,
        )

        assetFileNameMap[hashedFilePath] = path.resolve(
          desiredFileName,
        )
      }

      assetPaths.css.map(emitAssetWith(assetSrcs.css))
      assetPaths.img.map(emitAssetWith(assetSrcs.img))
      assetPaths.html.map(emitAssetWith(assetSrcs.html))

      if (copyManifest) {
        assetPaths.manifest.map(
          emitAssetWith(assetSrcs.manifest),
        )
      }
    },
  }
}
