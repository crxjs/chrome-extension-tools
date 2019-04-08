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

import * as reloader from './reloader/server'

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

export default function({
  pkg,
  verbose,
  permissions = {},
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
  let assets
  let srcDir

  let manifestPath

  const cache = {
    permissions: {},
  }

  const manifestName = 'manifest.json'

  const permissionsFilter = createFilter(
    permissions.include,
    permissions.exclude,
  )

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
      const { js, css, html, img } = deriveEntries(
        cache.manifest,
        {
          ...predObj,
          transform: name => path.join(srcDir, name),
        },
      )

      // Start async asset loading
      // CONCERN: relative paths within CSS files will fail
      // SOLUTION: use postcss to process CSS asset src
      assets = Promise.all([...css, ...img].map(loadAssetData))

      // Render only manifest entry js files
      // as async iife
      asyncIifeFilter = createFilter(js)

      // Cache derived inputs
      cache.input = js.concat(html)

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

    transform(code, id) {
      if (permissionsFilter(id)) {
        const perms = derivePermissions(code)

        if (perms.length) {
          // Derive permissions by module
          cache.permissions[id] = perms
        }
      }
    },

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
      const activeModuleSet = Object.values(bundle).reduce(
        (set, { modules }) => {
          Object.keys(modules).forEach(m => set.add(m))
          return set
        },
        new Set(),
      )

      // Aggregate permissions from all modules
      const permissions = Array.from(
        Object.entries(cache.permissions).reduce(
          (set, [id, perms]) => {
            if (perms.length && activeModuleSet.has(id)) {
              perms.forEach(p => set.add(p))
            }

            return set
          },
          new Set(),
        ),
      )

      if (verbose) {
        // Compare to last permissions
        const permsHash = JSON.stringify(permissions)

        if (!cache.permsHash) {
          console.log('Permissions:', permissions)
        } else if (permsHash !== cache.permsHash) {
          console.log('New permissions:', permissions)
        }

        cache.permsHash = permsHash
      }

      // Update manifest file paths
      const assetPathMapFns = await getAssetPathMapFns.call(
        this,
        assets,
      )

      try {
        const manifestBody = deriveManifest(
          pkg,
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
        if (error.name === 'ValidationError') {
          this.error(error)
        }

        throw error
      }
    },

    renderError(error) {
      if (error.name === 'ValidationError') {
        console.error(error.message)

        error.errors.forEach(err => {
          console.error(err)
        })
      }
    },

    writeBundle() {
      if (process.env.ROLLUP_WATCH) {
        reloader.reload()
      }
    },
  }
}
