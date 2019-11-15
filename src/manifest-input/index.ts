import { cosmiconfigSync } from 'cosmiconfig'
import fs from 'fs-extra'
import memoize from 'mem'
import path, { basename } from 'path'
import { EmittedAsset, OutputChunk, PluginHooks } from 'rollup'
import { ChromeExtensionManifest } from './manifest'
import {
  deriveFiles,
  deriveManifest,
  derivePermissions as dp,
} from './manifest-parser/index'
import { reduceToRecord } from './reduceToRecord'
import { setupLoaderScript } from './setupLoaderScript'

const explorer = cosmiconfigSync('manifest')

const isOutputChunk = (x: any): x is OutputChunk =>
  x.type === 'chunk'

const name = 'manifest-input'

const npmPkgDetails =
  process.env.npm_package_name &&
  process.env.npm_package_version &&
  process.env.npm_package_description
    ? {
        name: process.env.npm_package_name,
        version: process.env.npm_package_version,
        description: process.env.npm_package_description,
      }
    : {
        name: '',
        version: '',
        description: '',
      }

/* ============================================ */
/*                MANIFEST-INPUT                */
/* ============================================ */

export default function(
  {
    dynamicImportWrapper = {
      // Use these wake events by default until dynamic wake events is implemented
      wakeEvents: [
        'chrome.runtime.onMessage',
        'chrome.runtime.onInstalled',
      ],
    },
    pkg = npmPkgDetails,
    publicKey,
    verbose = true,
  } = {} as {
    dynamicImportWrapper?: {
      eventDelay?: number | false
      wakeEvents?: string[]
      noWakeEvents?: boolean
    }
    pkg?: {
      description: string
      name: string
      version: string
    }
    publicKey?: string
    verbose?: boolean
  },
): Pick<
  PluginHooks,
  'options' | 'buildStart' | 'watchChange' | 'generateBundle'
> & { name: string; srcDir: string } {
  const derivePermissions = memoize(dp)

  /* ----------- HOOKS CLOSURES START ----------- */

  let manifestPath: string

  interface Asset {
    srcPath: string
    source?: string
  }

  const cache: {
    assets: Asset[]
    input: string[]
    manifest?: ChromeExtensionManifest
    permsHash: string
    srcDir: string
  } = {
    assets: [] as Asset[],
    permsHash: '',
    srcDir: '',
    input: [] as string[],
  }

  const manifestName = 'manifest.json'

  /* ------------ HOOKS CLOSURES END ------------ */

  /* - SETUP DYNAMIC IMPORT LOADER SCRIPT START - */

  let loaderScript = setupLoaderScript(dynamicImportWrapper)

  /* -- SETUP DYNAMIC IMPORT LOADER SCRIPT END -- */

  /* --------------- plugin object -------------- */
  return {
    name,

    get srcDir() {
      return cache.srcDir
    },

    /* ============================================ */
    /*                 OPTIONS HOOK                 */
    /* ============================================ */

    options(options) {
      // Do not reload manifest without changes
      if (!cache.manifest) {
        /* ----------- LOAD AND PROCESS MANIFEST ----------- */

        if (typeof options.input !== 'string') {
          throw new TypeError(
            'RollupOptions.input must be a single Chrome extension manifest.',
          )
        }

        const configResult = explorer.load(options.input) as {
          filepath: string
          config: ChromeExtensionManifest
          isEmpty?: true
        } | null
        if (
          !configResult ||
          typeof configResult.config === 'undefined' ||
          configResult.isEmpty
        ) {
          throw new Error(
            `Could not load ${options.input} as Chrome extension manifest.`,
          )
        }

        manifestPath = configResult.filepath
        cache.manifest = configResult.config

        cache.srcDir = path.dirname(manifestPath)

        // Derive entry paths from manifest
        const { js, html, css, img } = deriveFiles(
          cache.manifest,
          cache.srcDir,
        )

        // Cache derived inputs
        cache.input = [...js, ...html]
        cache.assets = [...css, ...img].map((srcPath) => ({
          srcPath,
        }))

        /* --------------- END LOAD MANIFEST --------------- */
      }

      return {
        ...options,
        input: cache.input.reduce(
          reduceToRecord(cache.srcDir),
          {},
        ),
      }
    },

    /* ============================================ */
    /*              HANDLE WATCH FILES              */
    /* ============================================ */

    async buildStart(options) {
      this.addWatchFile(manifestPath)

      cache.assets.forEach(({ srcPath }) => {
        this.addWatchFile(srcPath)
      })

      const assets: EmittedAsset[] = await Promise.all(
        cache.assets.map(async ({ srcPath }) => {
          const source = await fs.readFile(srcPath)

          return {
            type: 'asset' as 'asset',
            source,
            fileName: srcPath
              .replace(cache.srcDir, '')
              .replace(/^\//, ''),
          }
        }),
      )

      assets.forEach((asset) => {
        this.emitFile(asset)
      })
    },

    watchChange(id) {
      if (
        id.endsWith(manifestName) ||
        // SMELL: why dump manifest if asset changes?
        //  - triggers reload of all assets if one changes
        //  - should trigger reload of one asset if it changes?
        cache.assets.some(({ srcPath }) => id === srcPath)
      ) {
        // Dump cache.manifest if manifest changes
        cache.manifest = undefined
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
        Object.values(bundle)
          .filter(isOutputChunk)
          .reduce(derivePermissions, new Set<string>()),
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
        // Clone cache.manifest
        const cachedManifest = JSON.parse(
          // FIXME: assert cache.manifest exists, should error if not
          JSON.stringify(cache.manifest || {}),
        )

        // SMELL: Is this necessary?
        const updatedManifest = {
          manifest_version: 2,
          name: pkg.name,
          version: pkg.version,
          description: pkg.description,
          ...cachedManifest,
        }

        // TODO: refactor, as this isn't really necessary
        const manifestBody: ChromeExtensionManifest = deriveManifest(
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
          [] as string[],
        )

        if (contentScripts.length) {
          // make all imports & dynamic imports web_acc_res
          // FEATURE: make imports for background not web_acc_res?
          const imports = Object.values(bundle)
            .filter((x): x is OutputChunk => x.type === 'chunk')
            .reduce(
              (r, { isEntry, fileName }) =>
                // Get imported filenames
                !isEntry ? [...r, fileName] : r,
              [] as string[],
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

        if (
          dynamicImportWrapper.wakeEvents &&
          dynamicImportWrapper.wakeEvents.length > 0
        ) {
          const emitDynamicImportWrapper = (
            scriptPath: string,
          ) => {
            const _scriptPath = scriptPath.replace(
              /\.ts$/,
              '.js',
            )
            const source = loaderScript(_scriptPath)

            const assetId = this.emitFile({
              type: 'asset',
              source,
              name: basename(_scriptPath),
            })

            return this.getFileName(assetId)
          }

          // Emit background script wrappers
          if (backgroundScripts.length) {
            manifestBody.background =
              manifestBody.background || {}

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
        }

        /* ---------- STABLE EXTENSION ID END --------- */

        /* ----------- OUTPUT MANIFEST.JSON BEGIN ---------- */

        const manifestJson = JSON.stringify(
          manifestBody,
          null,
          2,
        )
          // Replace ts and tsx in manifest
          .replace(/\.[jt]sx?"/g, '.js"')

        // TODO: validate manifest by schema

        // Emit manifest.json
        this.emitFile({
          type: 'asset',
          fileName: manifestName,
          source: manifestJson,
        })
      } catch (error) {
        if (error.name !== 'ValidationError') throw error

        error.errors.forEach((err: { message: string }) => {
          console.log(err)
        })

        this.error(error.message)
      }

      /* ------------ OUTPUT MANIFEST.JSON END ----------- */
    },
  }
}
