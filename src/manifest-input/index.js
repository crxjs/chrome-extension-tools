import {
  deriveEntries,
  deriveManifest,
  derivePermissions as dp,
} from '@bumble/manifest'
import fs from 'fs-extra'
import MagicString from 'magic-string'
import path from 'path'
import { createFilter } from 'rollup-pluginutils'
import { getAssetPathMapFns, loadAssetData } from '../helpers'
import { mapObjectValues } from './mapObjectValues'
import * as reloader from './reloader/server'
import pm from 'picomatch'
import isValidPath from 'is-valid-path'
import memoize from 'mem'

const name = 'manifest-input'

/* ---- predicate object for deriveEntries ---- */
// const predObj = {
//   js: s => /\.js$/.test(s),
//   css: s => /\.css$/.test(s),
//   html: s => /\.html$/.test(s),
//   img: s => /\.png$/.test(s),
//   filter: v =>
//     typeof v === 'string' &&
//     v.includes('.') &&
//     !v.includes('*') &&
//     !/^https?:/.test(v),
// }

const npmPkgDetails = {
  name: process.env.npm_package_name,
  version: process.env.npm_package_version,
  description: process.env.npm_package_description,
}

/* ============================================ */
/*                MANIFEST-INPUT                */
/* ============================================ */

export default function({
  pkg,
  verbose,
  permissions = {},
  assets = {
    include: ['**/*.png', '**/*.css'],
  },
  entries = {
    include: ['**/*'],
  },
} = {}) {
  if (!pkg) {
    pkg = npmPkgDetails
  }

  if (process.env.ROLLUP_WATCH) {
    console.log('starting reloader')
    reloader.start()
  }

  /* -------------- hooks closures -------------- */
  let asyncIifeFilter
  let loadedAssets
  let srcDir

  let manifestPath

  const cache = {}

  const manifestName = 'manifest.json'

  const permissionsFilter = createFilter(
    permissions.include,
    permissions.exclude,
  )

  const assetFilter = pm(assets.include, {
    ignore: assets.exclude,
  })

  const entryFilter = pm(entries.include, {
    ignore: entries.exclude,
  })

  const derivePermissions = memoize(dp)

  /* --------------- plugin object -------------- */
  return {
    name,

    /* ============================================ */
    /*                 OPTIONS HOOK                 */
    /* ============================================ */

    options(options) {
      // Do not reload manifest without changes
      if (cache.manifest) {
        return { ...options, input: cache.input }
      }

      manifestPath = options.input
      srcDir = path.dirname(manifestPath)

      // Check that input is manifest.json
      if (!manifestPath.endsWith(manifestName)) {
        throw new TypeError(
          `${name}: input is not manifest.json`,
        )
      }

      // Load manifest.json
      cache.manifest = fs.readJSONSync(manifestPath)

      // Derive entry paths from manifest
      const { assetPaths, entryPaths } = deriveEntries(
        cache.manifest,
        {
          assetPaths: assetFilter,
          entryPaths: entryFilter,
          transform: name => path.join(srcDir, name),
          filter: v =>
            typeof v === 'string' &&
            isValidPath(v) &&
            !/^https?:/.test(v),
        },
      )

      // Start async asset loading
      // CONCERN: relative paths within CSS files will fail
      // SOLUTION: use postcss to process CSS asset src
      loadedAssets = Promise.all(assetPaths.map(loadAssetData))

      // Render only manifest entry js files
      // as async iife
      const js = entryPaths.filter(p => /\.js$/.test(p))
      asyncIifeFilter = createFilter(js)

      // Cache derived inputs
      cache.input = entryPaths

      return { ...options, input: cache.input }
    },

    /* ============================================ */
    /*              HANDLE WATCH FILES              */
    /* ============================================ */

    buildStart() {
      this.addWatchFile(manifestPath)
    },

    watchChange(id) {
      if (id.endsWith(manifestName)) {
        // Dump cache.manifest if manifest.json changes
        cache.manifest = null
      }
    },

    /* ============================================ */
    /*                   TRANSFORM                  */
    /* ============================================ */

    // transform(code, id) {},

    /* ============================================ */
    /*       MAKE MANIFEST ENTRIES ASYNC IIFE       */
    /* ============================================ */

    renderChunk(
      source,
      { isEntry, facadeModuleId: id, fileName },
      { sourcemap },
    ) {
      if (!isEntry || !asyncIifeFilter(id)) return null

      // turn es imports to dynamic imports
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

      // Async IIFE-fy
      magic
        .indent('  ')
        .prepend('(async () => {\n')
        .append('\n})();\n')

      // Generate sourcemaps
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
      // Get module ids for all chunks
      const permissions = Array.from(
        Object.values(bundle).reduce(
          (set, { code, facadeModuleId: id }) => {
            if (permissionsFilter(id)) {
              return new Set([
                ...derivePermissions(code),
                ...set,
              ])
            } else {
              return set
            }
          },
          new Set(),
        ),
      )

      if (verbose) {
        // Compare to last permissions
        const permsHash = JSON.stringify(permissions)

        if (!cache.permsHash) {
          console.log('Derived permissions:', permissions)
        } else if (permsHash !== cache.permsHash) {
          console.log('Derived new permissions:', permissions)
        }

        cache.permsHash = permsHash
      }

      // Emit loaded assets and
      // Create asset path updaters
      const assetPathMapFns = await getAssetPathMapFns.call(
        this,
        loadedAssets,
      )

      try {
        const manifestBody = deriveManifest(
          pkg,
          // Update asset paths and return manifest
          assetPathMapFns.reduce(
            mapObjectValues,
            cache.manifest,
          ),
          permissions,
        )

        // Add reloader script
        if (process.env.ROLLUP_WATCH) {
          const clientId = this.emitAsset(
            'reloader-client.js',
            reloader.client,
          )

          const clientPath = this.getAssetFileName(clientId)

          if (!manifestBody.background) {
            manifestBody.background = {}
          }

          const { scripts = [] } = manifestBody.background

          manifestBody.background.scripts = [
            ...scripts,
            clientPath,
          ]

          manifestBody.background.persistent = true

          manifestBody.description =
            'DEVELOPMENT BUILD with auto-reloader script.'
        }

        // Mutate bundle to emit custom asset
        bundle[manifestName] = {
          fileName: manifestName,
          isAsset: true,
          source: JSON.stringify(manifestBody, null, 2),
        }
      } catch (error) {
        if (error.name !== 'ValidationError') throw error

        error.errors.forEach(err => {
          console.log(err)
        })

        this.error(error.message)
      }
    },

    writeBundle() {
      if (process.env.ROLLUP_WATCH) {
        reloader.reload()
      }
    },
  }
}
