import {
  deriveEntries,
  deriveManifest,
  derivePermissions as dp,
} from '@bumble/manifest'
import fs from 'fs-extra'
import isValidPath from 'is-valid-path'
import MagicString from 'magic-string'
import memoize from 'mem'
import path from 'path'
import pm from 'picomatch'
import { createFilter } from 'rollup-pluginutils'
import { getAssetPathMapFns, loadAssetData } from '../helpers'
import { mapObjectValues } from './mapObjectValues'

import * as socketReloader from '../reloader-socket/index'
import * as pushReloader from '../reloader-push/src/index'

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
  iiafe = {
    // include is defaulted to [], so exclude can be used by itself
  },
  publicKey,
  useReloader = process.env.ROLLUP_WATCH,
  reloader = 'socket',
} = {}) {
  if (!pkg) {
    pkg = npmPkgDetails
  }

  const _reloader =
    reloader === 'socket'
      ? socketReloader
      : reloader === 'push' && pushReloader

  if (useReloader) {
    console.log('starting reloader')
    _reloader.start()
  }

  /* -------------- hooks closures -------------- */
  iiafe.include = iiafe.include || []
  let iiafeFilter

  let loadedAssets
  let srcDir

  let manifestPath

  const cache = {}

  const manifestName = 'manifest.json'

  const permissionsFilter = pm(
    permissions.include || '**/*',
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
          transform: (name) => path.join(srcDir, name),
          filter: (v) =>
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
      const js = entryPaths.filter((p) => /\.js$/.test(p))
      iiafeFilter = createFilter(
        iiafe.include.concat(js),
        iiafe.exclude,
      )

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
      if (!isEntry || !iiafeFilter(id)) return null

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
            // The only use for this is to exclude a chunk
            if (id && permissionsFilter(id)) {
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
        if (useReloader) {
          const clientId = this.emitAsset(
            'reloader-client.js',
            _reloader.getClientCode(),
          )

          const clientPath = this.getAssetFileName(clientId)

          _reloader.updateManifest(manifestBody, clientPath)
        }

        if (publicKey) {
          manifestBody.key = publicKey
        } else {
          delete manifestBody.key
        }

        // Mutate bundle to emit custom asset
        bundle[manifestName] = {
          fileName: manifestName,
          isAsset: true,
          source: JSON.stringify(manifestBody, null, 2),
        }
      } catch (error) {
        if (error.name !== 'ValidationError') throw error

        error.errors.forEach((err) => {
          console.log(err)
        })

        this.error(error.message)
      }
    },

    writeBundle() {
      if (useReloader) {
        _reloader.reload()
      }
    },
  }
}
