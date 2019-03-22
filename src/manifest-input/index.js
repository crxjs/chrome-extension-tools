import path from 'path'
import fs from 'fs-extra'

import { deriveEntries } from '@bumble/manifest'
import { mapObjectValues } from './mapObjectValues'
import { loadAssetData, getAssetPathMapFns } from '../helpers'

const name = 'manifest-input'

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

/* ============================================ */
/*                MANIFEST-INPUT                */
/* ============================================ */

export default function({ transform = x => x }) {
  /* -------------- hooks closures -------------- */
  let manifest
  let assets
  let srcDir
  let destDir

  /* --------------- plugin object -------------- */
  return {
    name,

    /* ============================================ */
    /*                 OPTIONS HOOK                 */
    /* ============================================ */

    options({ input: manifestPath, ...inputOptions }) {
      // Check that input is manifest
      if (path.basename(manifestPath) !== 'manifest.json')
        throw new TypeError(
          `${name}: input is not manifest.json`,
        )

      // Load manifest.json
      manifest = fs.readJSONSync(manifestPath)
      srcDir = path.dirname(manifestPath)

      // Derive entry paths from manifest
      const { js, css, html, img } = deriveEntries(manifest, {
        ...predObj,
        transform: name => path.join(srcDir, name),
      })

      // Read assets async, emit later
      // CONCERN: relative paths within CSS files will fail
      // SOLUTION: use postcss to process CSS asset src
      //   Probably inline images here
      assets = Promise.all([...css, ...img].map(loadAssetData))

      // Return input as [js, html]
      return {
        ...inputOptions,
        input: js.concat(html),
      }
    },

    /* ============================================ */
    /*                GENERATEBUNDLE                */
    /* ============================================ */

    async generateBundle(options) {
      destDir = options.dir

      const assetPathMapFns = await getAssetPathMapFns.call(
        this,
        assets,
      )

      manifest = assetPathMapFns.reduce(
        mapObjectValues,
        manifest,
      )
    },

    /* ============================================ */
    /*                  WRITEBUNDLE                 */
    /* ============================================ */

    async writeBundle(bundle) {
      // Write manifest
      await fs.writeJSON(
        path.join(destDir, 'manifest.json'),
        transform(bundle, manifest),
        { spaces: 2 },
      )
    },
  }
}
