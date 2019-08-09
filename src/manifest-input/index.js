import {
  deriveEntries,
  deriveManifest,
  derivePermissions as dp,
} from '@bumble/manifest'
import fs from 'fs-extra'
import isValidPath from 'is-valid-path'
import memoize from 'mem'
import path from 'path'
import pm from 'picomatch'
import { getAssetPathMapFns, loadAssetData } from '../helpers'
import { mapObjectValues } from './mapObjectValues'

const name = 'manifest-input'

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
  verbose = true,
  assets = {
    include: [
      '**/*.png',
      '**/*.jpg',
      '**/*.jpeg',
      '**/*.gif',
      '**/*.css',
    ],
  },
  entries = {
    include: ['**/*.js', '**/*.html', '**/*.ts'],
  },
  publicKey,
  dynamicImportWrapper = {},
} = {}) {
  if (!pkg) {
    pkg = npmPkgDetails
  }

  /* ----------- HOOKS CLOSURES START ----------- */

  let loadedAssets
  let srcDir

  let manifestPath

  const cache = {}

  const manifestName = 'manifest.json'

  /* ------------ HOOKS CLOSURES END ------------ */

  /* - SETUP DYNAMIC IMPORT LOADER SCRIPT START - */

  let loaderScript

  if (typeof dynamicImportWrapper === 'object') {
    const {
      eventDelay = false,
      // FEATURE: add static code analysis for wake events
      //  - Use code comments?
      //  - This will be slower...
      // WAKE_EVENT: chrome.runtime.onMessage
      wakeEvents = [
        'chrome.runtime.onInstalled',
        'chrome.runtime.onMessage',
      ],
    } = dynamicImportWrapper

    const replaceDelay = (match, tag) => {
      if (typeof eventDelay === 'number') {
        return match.replace(tag, eventDelay)
      } else if (eventDelay === false) {
        return ''
      } else {
        throw new TypeError(
          'dynamicImportEventDelay must be false or a number',
        )
      }
    }

    const replaceSwitchCase = (index) => {
      const events = wakeEvents.map((e) => e.split('.')[index])

      return (match, tag) => {
        return events.length
          ? events.map((e) => match.replace(tag, e)).join('')
          : ''
      }
    }

    loaderScript = fs
      .readFileSync(
        path.join(__dirname, 'dynamicImportWrapper.js'),
        'utf-8',
      )
      .replace(
        /[\n\s]+.then\(delay\(('%DELAY%')\)\)([\n\s]+)/,
        replaceDelay,
      )
      .replace(
        /[\n\s]+case '(%NAME%)':[\n\s]+return true/,
        replaceSwitchCase(1),
      )
      .replace(
        /[\n\s]+case '(%EVENT%)':[\n\s]+return true/,
        replaceSwitchCase(2),
      )
  }

  /* -- SETUP DYNAMIC IMPORT LOADER SCRIPT END -- */

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
      loadedAssets = Promise.all(assetPaths.map(loadAssetData))

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
    /*                GENERATEBUNDLE                */
    /* ============================================ */

    async generateBundle(options, bundle) {
      /* ---------- DERIVE PERMISIONS START --------- */

      // FIXME: permissions are sometimes not derived
      // Get module ids for all chunks
      const permissions = Array.from(
        Object.values(bundle).reduce((set, { code }) => {
          return new Set([...derivePermissions(code), ...set])
        }, new Set()),
      )

      if (verbose) {
        // Compare to last permissions
        const permsHash = JSON.stringify(permissions)

        if (!cache.permsHash) {
          console.log('Detected permissions:', permissions)
        } else if (permsHash !== cache.permsHash) {
          console.log('Detected new permissions:', permissions)
        }

        cache.permsHash = permsHash
      }

      /* ---------- DERIVE PERMISSIONS END ---------- */

      try {
        // Emit loaded manifest.json assets and
        // Create asset path updater functions
        // Updater fn :: (string) -> string
        const assetPathMapFns = await getAssetPathMapFns.call(
          this,
          loadedAssets,
        )

        // Support ts in manifest
        const mapTsToJs = (x) => {
          if (typeof x !== 'string') {
            return x
          }

          if (x.endsWith('.ts')) {
            return x.replace('.ts', '.js')
          } else {
            return x
          }
        }

        const pathMapFns = [...assetPathMapFns, mapTsToJs]

        // Update asset paths
        const updatedManifest = pathMapFns.reduce(
          mapObjectValues,
          cache.manifest,
        )

        const manifestBody = deriveManifest(
          pkg,
          updatedManifest,
          permissions,
        )

        const {
          content_scripts: cts = [],
          web_accessible_resources: war = [],
          background: { scripts: backgroundScripts = [] } = {},
        } = manifestBody

        /* ------ WEB ACCESSIBLE RESOURCES START ------ */

        const contentScripts = cts.reduce(
          (r, { js }) => [...r, ...js],
          [],
        )

        if (contentScripts.length) {
          // make all imports & dynamic imports web_acc_res
          // FEATURE: make imports for background not web_acc_res?
          const imports = Object.values(bundle).reduce(
            (r, { isEntry: e, isAsset: a, fileName: f }) =>
              !e && !a ? [...r, f] : r,
            [],
          )

          // web_accessible_resources can be used for fingerprinting extensions
          manifestBody.web_accessible_resources = [
            ...war,
            ...imports,
            ...contentScripts,
          ]
        }

        /* ------- WEB ACCESSIBLE RESOURCES END ------- */

        /* ---- SCRIPT DYNAMIC IMPORT WRAPPER BEGIN --- */

        if (dynamicImportWrapper) {
          const emitDynamicImportWrapper = (scriptPath) => {
            const assetId = this.emitAsset(
              scriptPath,
              loaderScript.replace('%PATH%', `../${scriptPath}`),
            )

            return this.getAssetFileName(assetId)
          }

          // Emit background script wrappers
          if (backgroundScripts.length) {
            manifestBody.background.scripts = backgroundScripts.map(
              emitDynamicImportWrapper,
            )
          }

          // Emit content script wrappers
          if (cts.length) {
            manifestBody.content_scripts = cts.map(
              ({ js, ...rest }) => ({
                js: js.map(emitDynamicImportWrapper),
                ...rest,
              }),
            )
          }
        }

        /* ----- SCRIPT DYNAMIC IMPORT WRAPPER END ---- */

        /* --------- STABLE EXTENSION ID BEGIN -------- */

        if (publicKey) {
          manifestBody.key = publicKey
        } else {
          delete manifestBody.key
        }

        /* ---------- STABLE EXTENSION ID END --------- */

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
  }
}
