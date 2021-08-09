import { code as ctWrapperScript } from 'code ./browser/contentScriptWrapper.ts'
import { cosmiconfigSync } from 'cosmiconfig'
import fs from 'fs-extra'
import { JSONPath } from 'jsonpath-plus'
import memoize from 'mem'
import path, { basename, relative } from 'path'
import { EmittedAsset, OutputChunk } from 'rollup'
import slash from 'slash'
import {
  isChunk,
  isJsonFilePath,
  isPresent,
  normalizeFilename,
} from '../helpers'
import { isMV2, isMV3 } from '../manifest-types'
import {
  ManifestInputPlugin,
  ManifestInputPluginCache,
  ManifestInputPluginOptions,
} from '../plugin-options'
import { cloneObject } from './cloneObject'
import { prepImportWrapperScript } from './dynamicImportWrapper'
import { combinePerms } from './manifest-parser/combine'
import {
  deriveFiles,
  derivePermissions,
} from './manifest-parser/index'
import { validateManifest } from './manifest-parser/validate'
import { reduceToRecord } from './reduceToRecord'

export function dedupe<T>(x: T[]): T[] {
  return [...new Set(x)]
}

export const explorer = cosmiconfigSync('manifest', {
  cache: false,
})

const name = 'manifest-input'

// We use a stub if the manifest has no scripts
//   eg, a CSS only Chrome Extension
export const stubChunkNameForCssOnlyCrx =
  'stub__css-only-chrome-extension-manifest'

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

export function manifestInput(
  {
    browserPolyfill = false,
    contentScriptWrapper = true,
    crossBrowser = false,
    dynamicImportWrapper = {},
    extendManifest = {},
    firstClassManifest = true,
    iifeJsonPaths = [],
    pkg = npmPkgDetails,
    publicKey,
    verbose = true,
    cache = {
      assetChanged: false,
      assets: [],
      iife: [],
      input: [],
      inputAry: [],
      inputObj: {},
      permsHash: '',
      readFile: new Map<string, any>(),
      srcDir: null,
    } as ManifestInputPluginCache,
  } = {} as ManifestInputPluginOptions,
): ManifestInputPlugin {
  const readAssetAsBuffer = memoize(
    (filepath: string) => {
      return fs.readFile(filepath)
    },
    {
      cache: cache.readFile,
    },
  )

  /* ----------- HOOKS CLOSURES START ----------- */

  let manifestPath: string

  const manifestName = 'manifest.json'

  /* ------------ HOOKS CLOSURES END ------------ */

  /* - SETUP DYNAMIC IMPORT LOADER SCRIPT START - */

  let wrapperScript = ''
  if (dynamicImportWrapper !== false) {
    wrapperScript = prepImportWrapperScript(dynamicImportWrapper)
  }

  /* -- SETUP DYNAMIC IMPORT LOADER SCRIPT END -- */

  /* --------------- plugin object -------------- */
  return {
    name,

    browserPolyfill,
    crossBrowser,

    get srcDir() {
      return cache.srcDir
    },

    get formatMap() {
      return { iife: cache.iife }
    },

    /* ============================================ */
    /*                 OPTIONS HOOK                 */
    /* ============================================ */

    options(options) {
      // Do not reload manifest without changes
      if (!cache.manifest) {
        /* ----------- LOAD AND PROCESS MANIFEST ----------- */

        let inputManifestPath: string | undefined
        if (Array.isArray(options.input)) {
          const manifestIndex = options.input.findIndex(
            isJsonFilePath,
          )
          inputManifestPath = options.input[manifestIndex]
          cache.inputAry = [
            ...options.input.slice(0, manifestIndex),
            ...options.input.slice(manifestIndex + 1),
          ]
        } else if (typeof options.input === 'object') {
          inputManifestPath = options.input.manifest
          cache.inputObj = cloneObject(options.input)
          delete cache.inputObj['manifest']
        } else {
          inputManifestPath = options.input
        }

        if (!isJsonFilePath(inputManifestPath)) {
          throw new TypeError(
            'RollupOptions.input must be a single Chrome extension manifest.',
          )
        }

        const configResult = explorer.load(
          inputManifestPath,
        ) as {
          filepath: string
          config: chrome.runtime.Manifest
          isEmpty?: true
        }

        if (configResult.isEmpty) {
          throw new Error(`${options.input} is an empty file.`)
        }

        const { options_page, options_ui } = configResult.config
        if (isPresent(options_ui) && isPresent(options_page)) {
          throw new Error(
            'options_ui and options_page cannot both be defined in manifest.json.',
          )
        }

        manifestPath = configResult.filepath

        let extendedManifest: Partial<chrome.runtime.Manifest>
        if (typeof extendManifest === 'function') {
          extendedManifest = extendManifest(configResult.config)
        } else if (typeof extendManifest === 'object') {
          extendedManifest = {
            ...configResult.config,
            ...extendManifest,
          } as chrome.runtime.Manifest
        } else {
          extendedManifest = configResult.config
        }

        cache.manifest = validateManifest({
          // MV2 is default
          manifest_version: 2,
          name: pkg.name,
          // version must be all digits with up to three dots
          version: [
            ...(pkg.version?.matchAll(/\d+/g) ?? []),
          ].join('.'),
          description: pkg.description,
          ...extendedManifest,
        } as chrome.runtime.Manifest)
        cache.srcDir = path.dirname(manifestPath)

        // If the manifest is the source of truth for inputs
        //   `false` means that all inputs must come from Rollup config
        if (firstClassManifest) {
          // Any scripts from here will be regenerated as IIFE's
          cache.iife = iifeJsonPaths
            .map((jsonPath) => {
              const result = JSONPath({
                path: jsonPath,
                json: cache.manifest!,
              })

              return result
            })
            .flat(Infinity)

          // Derive entry paths from manifest
          const { js, html, css, img, others } = deriveFiles(
            cache.manifest,
            cache.srcDir,
          )

          // Cache derived inputs
          cache.input = [...cache.inputAry, ...js, ...html]

          cache.assets = [
            // Dedupe assets
            ...new Set([...css, ...img, ...others]),
          ]
        }

        /* --------------- END LOAD MANIFEST --------------- */
      }

      // Final `options.input` is an object
      //   this grants full compatibility with all Rollup options
      const finalInput = cache.input.reduce(
        reduceToRecord(cache.srcDir),
        cache.inputObj,
      )

      // Use a stub if no js scripts
      if (Object.keys(finalInput).length === 0) {
        finalInput[
          stubChunkNameForCssOnlyCrx
        ] = stubChunkNameForCssOnlyCrx
      }

      return { ...options, input: finalInput }
    },

    async buildStart() {
      /* ------------ WATCH ASSETS FOR CHANGES ----------- */

      this.addWatchFile(manifestPath)

      cache.assets.forEach((srcPath) => {
        this.addWatchFile(srcPath)
      })

      /* ------------------ EMIT ASSETS ------------------ */

      const assets: EmittedAsset[] = await Promise.all(
        cache.assets.map(async (srcPath) => {
          const source = await readAssetAsBuffer(srcPath)

          return {
            type: 'asset' as const,
            source,
            fileName: path.relative(cache.srcDir!, srcPath),
          }
        }),
      )

      assets.forEach((asset) => {
        this.emitFile(asset)
      })

      // MV2 manifest is handled in `generateBundle`
      if (isMV2(cache.manifest)) return

      /* --------------- EMIT MV3 MANIFEST --------------- */

      const manifestBody = cloneObject(cache.manifest!)
      const manifestJson = JSON.stringify(manifestBody).replace(
        /\.[jt]sx?"/g,
        '.js"',
      )

      // Emit manifest.json
      this.emitFile({
        type: 'asset',
        fileName: manifestName,
        source: manifestJson,
      })
    },

    resolveId(source) {
      if (source === stubChunkNameForCssOnlyCrx) {
        return source
      }

      return null
    },

    load(id) {
      if (id === stubChunkNameForCssOnlyCrx) {
        return {
          code: `console.log(${stubChunkNameForCssOnlyCrx})`,
        }
      }

      return null
    },

    watchChange(id) {
      if (id.endsWith(manifestName)) {
        // Dump cache.manifest if manifest changes
        delete cache.manifest
        cache.assetChanged = false
      } else {
        // Force new read of changed asset
        cache.assetChanged = cache.readFile.delete(id)
      }
    },

    /* ============================================ */
    /*                GENERATEBUNDLE                */
    /* ============================================ */

    generateBundle(options, bundle) {
      /* ----------------- CLEAN UP STUB ----------------- */

      delete bundle[stubChunkNameForCssOnlyCrx + '.js']

      // We don't support completely empty bundles
      if (Object.keys(bundle).length === 0) {
        throw new Error(
          'The Chrome extension must have at least one asset (html or css) or script file.',
        )
      }

      // MV3 is handled in `buildStart` to support Vite
      if (isMV3(cache.manifest)) return

      /* ------------------------------------------------- */
      /*                 EMIT MV2 MANIFEST                 */
      /* ------------------------------------------------- */

      /* ------------ DERIVE PERMISSIONS START ----------- */

      let permissions: string[] = []
      // Get module ids for all chunks
      if (cache.assetChanged && cache.permsHash) {
        // Permissions did not change
        permissions = JSON.parse(cache.permsHash) as string[]

        cache.assetChanged = false
      } else {
        const chunks = Object.values(bundle).filter(isChunk)

        // Permissions may have changed
        permissions = Array.from(
          chunks.reduce(derivePermissions, new Set<string>()),
        )

        const permsHash = JSON.stringify(permissions)

        if (verbose && permissions.length) {
          if (!cache.permsHash) {
            this.warn(
              `Detected permissions: ${permissions.toString()}`,
            )
          } else if (permsHash !== cache.permsHash) {
            this.warn(
              `Detected new permissions: ${permissions.toString()}`,
            )
          }
        }

        cache.permsHash = permsHash
      }

      const clonedManifest = cloneObject(
        cache.manifest,
      ) as chrome.runtime.ManifestV2

      const manifestBody = {
        ...clonedManifest,
        permissions: combinePerms(
          permissions,
          clonedManifest.permissions || [],
        ),
      }

      const {
        background: { scripts: bgs = [] } = {},
        content_scripts: cts = [],
        web_accessible_resources: war = [],
      } = manifestBody

      /* ------------ SETUP BACKGROUND SCRIPTS ----------- */

      // Emit background script wrappers
      if (bgs.length && wrapperScript.length) {
        // background exists because bgs has scripts
        manifestBody.background!.scripts = bgs
          .map(normalizeFilename)
          .map((scriptPath: string) => {
            // Loader script exists because of type guard above
            const source =
              // Path to module being loaded
              wrapperScript.replace(
                '%PATH%',
                // Fix path slashes to support Windows
                JSON.stringify(
                  slash(relative('assets', scriptPath)),
                ),
              )

            const assetId = this.emitFile({
              type: 'asset',
              source,
              name: basename(scriptPath),
            })

            return this.getFileName(assetId)
          })
          .map((p) => slash(p))
      }

      /* ---------- END SETUP BACKGROUND SCRIPTS --------- */

      /* ------------- SETUP CONTENT SCRIPTS ------------- */

      const contentScripts = cts.reduce(
        (r, { js = [] }) => [...r, ...js],
        [] as string[],
      )

      if (contentScriptWrapper && contentScripts.length) {
        const memoizedEmitter = memoize((scriptPath: string) => {
          const source = ctWrapperScript.replace(
            '%PATH%',
            // Fix path slashes to support Windows
            JSON.stringify(
              slash(relative('assets', scriptPath)),
            ),
          )

          const assetId = this.emitFile({
            type: 'asset',
            source,
            name: basename(scriptPath),
          })

          return this.getFileName(assetId)
        })

        // Setup content script import wrapper
        manifestBody.content_scripts = cts.map(
          ({ js, ...rest }) => {
            return typeof js === 'undefined'
              ? rest
              : {
                  js: js
                    .map(normalizeFilename)
                    .map(memoizedEmitter)
                    .map((p) => slash(p)),
                  ...rest,
                }
          },
        )

        // make all imports & dynamic imports web_acc_res
        const imports = Object.values(bundle)
          .filter((x): x is OutputChunk => x.type === 'chunk')
          .reduce(
            (r, { isEntry, fileName }) =>
              // Get imported filenames
              !isEntry ? [...r, fileName] : r,
            [] as string[],
          )

        // SMELL: web accessible resources can be used for fingerprinting extensions
        manifestBody.web_accessible_resources = dedupe([
          ...war,
          // FEATURE: filter out imports for background?
          ...imports,
          // Need to be web accessible b/c of import
          ...contentScripts,
        ]).map((p) => slash(p))

        /* ----------- END SETUP CONTENT SCRIPTS ----------- */
      }

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
      ).replace(/\.[jt]sx?"/g, '.js"')

      // Emit manifest.json
      this.emitFile({
        type: 'asset',
        fileName: manifestName,
        source: manifestJson,
      })

      /* ------------ OUTPUT MANIFEST.JSON END ----------- */
    },
  }
}

export default manifestInput
