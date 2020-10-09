import { code as contentScriptWrapper } from 'code ./browser/contentScriptWrapper.ts'
import { cosmiconfigSync } from 'cosmiconfig'
import fs from 'fs-extra'
import memoize from 'mem'
import path, { basename, relative } from 'path'
import { EmittedAsset, OutputChunk, PluginHooks } from 'rollup'
import slash from 'slash'
import { isChunk, isJsonFilePath } from '../helpers'
import { ChromeExtensionManifest } from '../manifest'
import { cloneObject } from './cloneObject'
import {
  DynamicImportWrapperOptions,
  prepImportWrapperScript,
} from './dynamicImportWrapper'
import { combinePerms } from './manifest-parser/combine'
import {
  deriveFiles,
  derivePermissions,
} from './manifest-parser/index'
import {
  validateManifest,
  ValidationErrorsArray,
} from './manifest-parser/validate'
import { reduceToRecord } from './reduceToRecord'

export function dedupe<T>(x: T[]): T[] {
  return [...new Set(x)]
}

export interface ManifestInputPluginCache {
  assets: string[]
  input: string[]
  inputAry: string[]
  inputObj: Record<string, string>
  permsHash: string
  srcDir: string | null
  /** for memoized fs.readFile */
  readFile: Map<string, any>
  manifest?: ChromeExtensionManifest
  assetChanged: boolean
}

export type ManifestInputPlugin = Pick<
  PluginHooks,
  'options' | 'buildStart' | 'watchChange' | 'generateBundle'
> & {
  name: string
  srcDir: string | null
}

export const explorer = cosmiconfigSync('manifest', {
  cache: false,
})

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

export function manifestInput(
  {
    dynamicImportWrapper = {},
    pkg = npmPkgDetails,
    publicKey,
    verbose = true,
    cache = {
      assetChanged: false,
      assets: [],
      input: [],
      inputAry: [],
      inputObj: {},
      permsHash: '',
      readFile: new Map<string, any>(),
      srcDir: null,
    } as ManifestInputPluginCache,
  } = {} as {
    dynamicImportWrapper?: DynamicImportWrapperOptions | false
    pkg?: {
      description: string
      name: string
      version: string
    }
    publicKey?: string
    verbose?: boolean
    cache?: ManifestInputPluginCache
  },
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
          config: ChromeExtensionManifest
          isEmpty?: true
        }

        if (configResult.isEmpty) {
          throw new Error(`${options.input} is an empty file.`)
        }

        const { options_page, options_ui } = configResult.config
        if (
          options_page !== undefined &&
          options_ui !== undefined
        ) {
          throw new Error(
            'options_ui and options_page cannot both be defined in manifest.json.',
          )
        }

        manifestPath = configResult.filepath
        cache.manifest = configResult.config

        cache.srcDir = path.dirname(manifestPath)

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

        /* --------------- END LOAD MANIFEST --------------- */
      }

      if (cache.input.length === 0) {
        throw new Error(
          'The manifest must have at least one script or HTML file.',
        )
      }

      // TODO: consider using this.emitFile in buildStart instead
      //  - the input record is unusual, but would this be more unusual?
      //  - would need to put something here, can't return an empty input
      //    - maybe a dummy file to remove in generateBundle?
      return {
        ...options,
        input: cache.input.reduce(
          reduceToRecord(cache.srcDir),
          cache.inputObj,
        ),
      }
    },

    /* ============================================ */
    /*              HANDLE WATCH FILES              */
    /* ============================================ */

    async buildStart() {
      this.addWatchFile(manifestPath)

      cache.assets.forEach((srcPath) => {
        this.addWatchFile(srcPath)
      })

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
      /* ---------- DERIVE PERMISIONS START --------- */

      // Get module ids for all chunks
      let permissions: string[]
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

        if (verbose) {
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

      /* ---------- DERIVE PERMISSIONS END ---------- */

      try {
        // Clone cache.manifest
        if (!cache.manifest)
          // This is a programming error, so it should throw
          throw new TypeError(
            `cache.manifest is ${typeof cache.manifest}`,
          )

        const clonedManifest = cloneObject(cache.manifest)

        const manifestBody = validateManifest({
          manifest_version: 2,
          name: pkg.name,
          version: pkg.version,
          description: pkg.description,
          ...clonedManifest,
          permissions: combinePerms(
            permissions,
            clonedManifest.permissions || [],
          ),
        })

        const {
          content_scripts: cts = [],
          web_accessible_resources: war = [],
          background: { scripts: bgs = [] } = {},
        } = manifestBody

        /* ------------- SETUP CONTENT SCRIPTS ------------- */

        const contentScripts = cts.reduce(
          (r, { js = [] }) => [...r, ...js],
          [] as string[],
        )

        if (contentScripts.length) {
          const memoizedEmitter = memoize(
            (scriptPath: string) => {
              const source = contentScriptWrapper.replace(
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
            },
          )

          // Setup content script import wrapper
          manifestBody.content_scripts = cts.map(
            ({ js, ...rest }) =>
              typeof js === 'undefined'
                ? rest
                : {
                    js: js
                      .map((p) => p.replace(/\.ts$/, '.js'))
                      .map(memoizedEmitter),
                    ...rest,
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
          ])
        }

        /* ----------- END SETUP CONTENT SCRIPTS ----------- */

        /* ------------ SETUP BACKGROUND SCRIPTS ----------- */

        // Emit background script wrappers
        if (bgs.length && wrapperScript.length) {
          // background exists because bgs has scripts
          manifestBody.background!.scripts = bgs
            // SMELL: is this replace necessary? are we doing somewhere else?
            .map((p) => p.replace(/\.ts$/, '.js'))
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
        }

        /* ---------- END SETUP BACKGROUND SCRIPTS --------- */

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
          // SMELL: is this necessary?
          .replace(/\.[jt]sx?"/g, '.js"')

        // Emit manifest.json
        this.emitFile({
          type: 'asset',
          fileName: manifestName,
          source: manifestJson,
        })
      } catch (error) {
        // Catch here because we need the validated result in scope

        if (error.name !== 'ValidationError') throw error
        const errors = error.errors as ValidationErrorsArray
        if (errors) {
          errors.forEach((err) => {
            // FIXME: make a better validation error message
            // https://github.com/atlassian/better-ajv-errors
            this.warn(JSON.stringify(err, undefined, 2))
          })
        }
        this.error(error.message)
      }

      /* ------------ OUTPUT MANIFEST.JSON END ----------- */
    },
  }
}

export default manifestInput
