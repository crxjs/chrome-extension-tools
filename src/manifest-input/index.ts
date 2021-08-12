import { code as ctWrapperScript } from 'code ./browser/contentScriptWrapper.ts'
import { cosmiconfigSync } from 'cosmiconfig'
import fs from 'fs-extra'
import { JSONPath } from 'jsonpath-plus'
import memoize from 'mem'
import path, { basename, relative } from 'path'
import { EmittedAsset, OutputChunk, RollupOptions } from 'rollup'
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
import { hashCode } from './crypto'
import { prepImportWrapperScript } from './dynamicImportWrapper'
import { combinePerms } from './manifest-parser/combine'
import {
  deriveFiles,
  derivePermissions,
} from './manifest-parser/index'
import { validateManifest } from './manifest-parser/validate'
import { reduceToRecord } from './reduceToRecord'

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
      contentScripts: [],
      contentScriptCode: {},
      contentScriptIds: {},
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
      /* ----------- LOAD AND PROCESS MANIFEST ----------- */

      // Do not reload manifest without changes
      if (!cache.manifest) {
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
        cache.srcDir = path.dirname(manifestPath)

        let extendedManifest: Partial<chrome.runtime.Manifest>
        if (typeof extendManifest === 'function') {
          extendedManifest = extendManifest(configResult.config)
        } else if (typeof extendManifest === 'object') {
          extendedManifest = {
            ...configResult.config,
            ...extendManifest,
          } as Partial<chrome.runtime.Manifest>
        } else {
          extendedManifest = configResult.config
        }

        const fullManifest = {
          // MV2 is default
          manifest_version: 2,
          name: pkg.name,
          // version must be all digits with up to three dots
          version: [
            ...(pkg.version?.matchAll(/\d+/g) ?? []),
          ].join('.'),
          description: pkg.description,
          ...extendedManifest,
        } as chrome.runtime.Manifest

        // If the manifest is the source of truth for inputs
        //   `false` means that all inputs must come from Rollup config
        if (firstClassManifest) {
          // Any scripts from here will be regenerated as IIFE's
          cache.iife = iifeJsonPaths
            .map((jsonPath) => {
              const result = JSONPath({
                path: jsonPath,
                json: fullManifest,
              })

              return result
            })
            .flat(Infinity)

          // Derive entry paths from manifest
          const {
            js,
            html,
            css,
            img,
            others,
            contentScripts,
          } = deriveFiles(fullManifest, cache.srcDir, {
            contentScripts: true,
          })

          cache.contentScripts = contentScripts

          // Cache derived inputs
          cache.input = [...cache.inputAry, ...js, ...html]

          cache.assets = [
            // Dedupe assets
            ...new Set([...css, ...img, ...others]),
          ]
        }

        if (isMV3(fullManifest)) {
          if (fullManifest.background)
            fullManifest.background.type = 'module'
          if (fullManifest.content_scripts) {
            const { output = {} } = options as RollupOptions
            const {
              chunkFileNames = 'chunks/[name]-[hash].js',
            } = Array.isArray(output) ? output[0] : output

            cache.chunkFileNames = chunkFileNames

            // Output could be an array
            if (Array.isArray(output)) {
              if (
                // Should only be one value for chunkFileNames
                output.reduce(
                  (r, x) => r.add(x.chunkFileNames ?? 'no cfn'),
                  new Set(),
                ).size > 1
              )
                // We need to know chunkFileNames now, before the output stage
                throw new TypeError(
                  'Multiple output values for chunkFileNames are not supported',
                )

              // If chunkFileNames is undefined, use our default
              output.forEach(
                (x) => (x.chunkFileNames = chunkFileNames),
              )
            } else {
              // If chunkFileNames is undefined, use our default
              output.chunkFileNames = chunkFileNames
            }

            const allMatches = fullManifest.content_scripts
              .flatMap(({ matches }) => matches ?? [])
              .concat(fullManifest.host_permissions ?? [])

            const matches = Array.from(new Set(allMatches))
            const resources = [
              `${chunkFileNames
                .split('/')
                .join('/')
                .replace('[format]', '*')
                .replace('[name]', '*')
                .replace('[hash]', '*')}`,
            ]

            fullManifest.web_accessible_resources =
              fullManifest.web_accessible_resources ?? []

            fullManifest.web_accessible_resources.push({
              resources,
              matches,
            })
          }
        }

        cache.manifest = validateManifest(fullManifest)
      }
      /* --------------- END LOAD MANIFEST --------------- */

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

      /* ------------ WARN DEPRECATED OPTIONS ------------ */

      if (crossBrowser)
        this.warn(
          '`options.crossBrowser` is not implemented yet',
        )

      if (!firstClassManifest)
        this.warn(
          '`options.firstClassManifest` will be removed in version 5.0.0',
        )

      if (iifeJsonPaths.length)
        this.warn(
          '`options.iifeJsonPaths` is not implemented yet',
        )

      // MV2 manifest is handled in `generateBundle`
      if (isMV2(cache.manifest)) return

      if (browserPolyfill)
        this.warn(
          [
            '`options.browserPolyfill` is deprecated for MV3 and does nothing internally',
            'See: https://extend-chrome.dev/rollup-plugin#mv3-faq',
          ].join('\n'),
        )

      if (dynamicImportWrapper)
        this.warn(
          '`options.dynamicImportWrapper` is not required for MV3',
        )

      if (publicKey)
        this.warn(
          [
            '`options.publicKey` is deprecated for MV3,',
            'please use `options.extendManifest` instead',
            'see: https://extend-chrome.dev/rollup-plugin#mv3-faq',
          ].join('\n'),
        )

      /* --------------- EMIT MV3 MANIFEST --------------- */

      const manifestBody = cloneObject(cache.manifest!)
      const manifestJson = JSON.stringify(
        manifestBody,
        undefined,
        2,
      ).replace(/\.[jt]sx?"/g, '.js"')

      // Emit manifest.json
      this.emitFile({
        type: 'asset',
        fileName: manifestName,
        source: manifestJson,
      })
    },

    async resolveId(source, importer) {
      if (source === stubChunkNameForCssOnlyCrx) {
        return source
      } else if (cache.contentScriptIds[source]) {
        return source
      } else if (importer && cache.contentScriptIds[importer]) {
        const result = await this.resolve(
          source,
          cache.contentScriptIds[importer],
        )
        return result?.id ?? null
      }

      return null
    },

    load(id) {
      if (id === stubChunkNameForCssOnlyCrx) {
        return {
          code: `console.log(${stubChunkNameForCssOnlyCrx})`,
        }
      }

      return cache.contentScriptCode[id] ?? null
    },

    // FIXME: test this against real usage
    transform(code, id) {
      if (
        isMV2(cache.manifest) ||
        !cache.contentScripts.includes(id)
      )
        return code

      const [basename, ...rest] = id.split('/').reverse()
      const name = basename.replace(/\.[jt]sx?/g, '')

      const fileName = cache
        .chunkFileNames!.replace('[format]', 'esm')
        .replace('[name]', name)
        .replace('[hash]', hashCode(code))
      const chunkId = [...rest.reverse(), fileName].join('/')
      this.emitFile({
        id: chunkId,
        type: 'chunk',
        fileName,
      })

      cache.contentScriptCode[chunkId] = code
      cache.contentScriptIds[chunkId] = id

      return [
        '// This is an import wrapper used to support ESM in content scripts.',
        // TODO: add link to docs
        `import(chrome.runtime.getURL(${JSON.stringify(
          fileName,
        )})).catch(console.error)`,
      ].join('\n')
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

        manifestBody.web_accessible_resources = Array.from(
          new Set([
            ...war,
            // FEATURE: filter out imports for background?
            ...imports,
            // Need to be web accessible b/c of import
            ...contentScripts,
          ]),
        ).map((p) => slash(p))

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
