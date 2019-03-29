import path from 'path'
import fs from 'fs-extra'

import { deriveEntries } from '@bumble/manifest'
import { mapObjectValues } from './mapObjectValues'
import { loadAssetData, getAssetPathMapFns } from '../helpers'

import MagicString from 'magic-string'
import { createFilter } from 'rollup-pluginutils'

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

const regx = {
  importLine: /^import (.+) from ('.+?');$/gm,
  asg: /(?<=\{.+)( as )(?=.+?\})/g,
}

/* ============================================ */
/*                MANIFEST-INPUT                */
/* ============================================ */

export default function({ transform = x => x } = {}) {
  /* -------------- hooks closures -------------- */
  let manifest
  let filter
  let assets
  let srcDir

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

      filter = createFilter(js)

      // Return input as [js, html]
      return {
        ...inputOptions,
        input: js.concat(html),
      }
    },

    /* ============================================ */
    /*                 RENDER CHUNK                 */
    /* ============================================ */

    renderChunk(
      source,
      { isEntry, facadeModuleId: id, fileName },
      { sourcemap },
    ) {
      if (!isEntry || !filter(id)) return null

      const code = source.replace(
        regx.importLine,
        (line, $1, $2) => {
          const asg = $1.replace(regx.asg, ': ')
          return `const ${asg} = await import(${$2});`
        },
      )

      const magic = new MagicString(code)

      magic
        .indent('  ')
        .prepend('(async () => {\n')
        .append('\n})();\n')

      return sourcemap
        ? {
            code: magic.toString(),
            map: magic.generateMap({
              source: fileName,
            }),
          }
        : { code: magic.toString() }
    },

    /* ============================================ */
    /*                GENERATEBUNDLE                */
    /* ============================================ */

    async generateBundle(options, bundle) {
      const assetPathMapFns = await getAssetPathMapFns.call(
        this,
        assets,
      )

      const manifestBody = transform(
        bundle,
        // update asset paths
        assetPathMapFns.reduce(mapObjectValues, manifest),
      )

      const manifestName = 'manifest.json'

      // Mutate bundle to emit custom asset
      bundle[manifestName] = {
        fileName: manifestName,
        isAsset: true,
        source: JSON.stringify(manifestBody, null, 2),
      }
    },

    /* ============================================ */
    /*                  WRITEBUNDLE                 */
    /* ============================================ */

    // async writeBundle(bundle) {
    //   // Write manifest
    //   await fs.writeJSON(
    //     path.join(destDir, 'manifest.json'),
    //     transform(bundle, manifest),
    //     { spaces: 2 },
    //   )
    // },
  }
}
