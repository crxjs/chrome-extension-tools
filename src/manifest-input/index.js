import path from 'path'
import fs from 'fs-extra'

import { deriveEntries } from '@bumble/manifest-entry-points'

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

/* ------------- helper functions ------------- */

export default function(hooks) {
  /* -------------- hooks closures -------------- */
  let assets
  let manifest
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
      assets = Promise.all(
        [...css, ...img].map(asset =>
          fs.readFile(asset).then(src => [asset, src]),
        ),
      )

      // Return input as [js, html]
      return {
        ...inputOptions,
        input: js.concat(html),
      }
    },

    /* ============================================ */
    /*                GENERATEBUNDLE                */
    /* ============================================ */

    generateBundle(options, bundle) {
      destDir = options.dir

      // emit assets here? and transform manifest
    },

    /* ============================================ */
    /*                  WRITEBUNDLE                 */
    /* ============================================ */

    async writeBundle(bundle) {
      const finalManifest = hooks.transform(bundle, manifest)

      await fs.writeFile(
        path.join(destDir, 'manifest.json'),
        JSON.stringify(finalManifest),
      )
    },
  }
}
