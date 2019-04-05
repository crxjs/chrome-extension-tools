import path from 'path'
import fs from 'fs-extra'

import {
  deriveEntries,
  derivePermissions,
  deriveManifest,
} from '@bumble/manifest'
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

const npmPkgDetails = {
  name: process.env.npm_package_name,
  version: process.env.npm_package_version,
  description: process.env.npm_package_description,
}

/* ============================================ */
/*                MANIFEST-INPUT                */
/* ============================================ */

export default function({ pkg } = {}) {
  if (!pkg) {
    pkg = npmPkgDetails
  }

  /* ---- validate pkg for deriveManifest --- */
  if (Object.values(pkg).some(x => !x)) {
    // throw JSON.stringify(pkg)
    throw 'chrome-extension: Failed to derive manifest, options.pkg is not fully defined. Please run through npm scripts.'
  }

  /* -------------- hooks closures -------------- */
  let filter
  let assets
  let srcDir

  let manifestPath

  const cache = {
    permissions: {},
  }

  const manifestName = 'manifest.json'

  /* --------------- plugin object -------------- */
  return {
    name,

    /* ============================================ */
    /*                 OPTIONS HOOK                 */
    /* ============================================ */

    options(options) {
      if (cache.manifest)
        return { ...options, input: cache.input }

      manifestPath = options.input
      srcDir = path.dirname(manifestPath)

      // Check that input is manifest
      if (!manifestPath.endsWith(manifestName)) {
        throw new TypeError(
          `${name}: input is not manifest.json`,
        )
      }

      // Load manifest.json
      cache.manifest = fs.readJSONSync(manifestPath)

      // Derive entry paths from manifest
      const { js, css, html, img } = deriveEntries(
        cache.manifest,
        {
          ...predObj,
          transform: name => path.join(srcDir, name),
        },
      )

      // Read assets async, emit later
      // CONCERN: relative paths within CSS files will fail
      // SOLUTION: use postcss to process CSS asset src
      //   Probably inline images here
      assets = Promise.all([...css, ...img].map(loadAssetData))

      filter = createFilter(js)

      cache.input = js.concat(html)

      const result = { ...options, input: cache.input }

      // manifest options hook
      return result
    },

    buildStart() {
      this.addWatchFile(manifestPath)
    },

    /* ============================================ */
    /*                   TRANSFORM                  */
    /* ============================================ */

    transform(code, id) {
      cache.permissions[id] = derivePermissions(code)
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
        /^import (.+) from ('.+?');$/gm,
        (line, $1, $2) => {
          const asg = $1.replace(
            /(?<=\{.+)( as )(?=.+?\})/g,
            ': ',
          )
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
              hires: true,
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

      const chunks = Object.values(bundle).filter(
        // get chunks
        ({ isAsset }) => !isAsset,
      )

      const activeModules = Array.from(
        chunks.reduce(
          // get module ids for all chunks
          (set, { modules }) => {
            Object.keys(modules).forEach(m => set.add(m))
            return set
          },
          new Set(),
        ),
      )

      const permissions = Array.from(
        activeModules.reduce((set, id) => {
          const cached = cache.permissions[id]

          if (cached) {
            cached.forEach(p => set.add(p))
          } else {
            throw 'missing cached permissions'
          }

          return set
        }, new Set()),
      ).sort()

      const permsHash = JSON.stringify(permissions)

      if (permsHash !== cache.permsHash) {
        console.log('new permissions:', permissions)
        cache.permsHash = permsHash
      }

      const manifestBody = deriveManifest(
        pkg,
        assetPathMapFns.reduce(mapObjectValues, cache.manifest),
        permissions,
      )

      // Mutate bundle to emit custom asset
      bundle[manifestName] = {
        fileName: manifestName,
        isAsset: true,
        source: JSON.stringify(manifestBody, null, 2),
      }
    },

    watchChange(id) {
      if (id.endsWith(manifestName)) {
        cache.manifest = null
      }
    },
  }
}
