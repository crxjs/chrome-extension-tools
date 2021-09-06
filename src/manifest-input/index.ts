import { regenerateBundle } from '$src/mixed-format/regenerateBundle'
import { cosmiconfigSync } from 'cosmiconfig'
import fs from 'fs-extra'
import memoize from 'mem'
import path from 'path'
import { EmittedAsset } from 'rollup'
import { isChunk, isPresent } from '../helpers'
import { isMV2, isMV3 } from '../manifest-types'
import {
  ManifestInputPlugin,
  ManifestInputPluginCache,
  ManifestInputPluginOptions,
} from '../plugin-options'
import { getViteServer, VITE_SERVER_URL } from '../viteAdaptor'
import { prepImportWrapperScript } from './dynamicImportWrapper'
import {
  assetFileNames,
  chunkFileNames,
  entryFileNames,
  generateFileNames,
  stubIdForNoScriptChromeExtensions,
} from './fileNames'
import { getInputManifestPath } from './getInputManifestPath'
import { deriveFiles } from './manifest-parser/index'
import { validateManifest } from './manifest-parser/validate'
import { reduceToRecord } from './reduceToRecord'
import { updateManifest } from './updateManifest'
import { warnDeprecatedOptions } from './warnDeprecatedOptions'

export const explorer = cosmiconfigSync('manifest', {
  cache: false,
  loaders: {
    '.ts': (filePath: string) => {
      require('esbuild-runner/register')
      const result = require(filePath)

      return result.default ?? result
    },
  },
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
    browserPolyfill = false,
    contentScriptWrapper,
    crossBrowser = false,
    dynamicImportWrapper,
    extendManifest = {},
    firstClassManifest,
    iifeJsonPaths = [],
    pkg = npmPkgDetails,
    publicKey,
    verbose,
    wrapContentScripts,
    cache = {
      assetChanged: false,
      assets: [],
      contentScripts: [],
      background: [],
      contentScriptCode: {},
      contentScriptIds: {},
      input: [],
      inputAry: [],
      inputObj: {},
      permsHash: '',
      readFile: new Map<string, any>(),
      srcDir: process.cwd(),
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

  let manifestPath: string
  const manifestName = 'manifest.json'

  const backgroundScriptWrapper = prepImportWrapperScript({})
  return {
    name,

    browserPolyfill,
    crossBrowser,

    get srcDir() {
      return cache.srcDir
    },

    /* ============================================ */
    /*                 OPTIONS HOOK                 */
    /* ============================================ */

    options(options) {
      /* ----------- LOAD AND PROCESS MANIFEST ----------- */

      // Do not reload manifest without changes
      if (!cache.manifest) {
        const { inputManifestPath, ...cacheValues } =
          getInputManifestPath(options)

        Object.assign(cache, cacheValues)

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

        // Derive entry paths from manifest
        const {
          js,
          html,
          css,
          img,
          others,
          contentScripts,
          background,
        } = deriveFiles(fullManifest, cache.srcDir)

        cache.contentScripts = contentScripts
        cache.background = background

        // Cache derived inputs
        cache.input = [...cache.inputAry, ...js, ...html]

        cache.assets = [
          // Dedupe assets
          ...new Set([...css, ...img, ...others]),
        ]

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
        finalInput[stubIdForNoScriptChromeExtensions] =
          stubIdForNoScriptChromeExtensions
      }

      return { ...options, input: finalInput }
    },

    async buildStart() {
      warnDeprecatedOptions.call(
        this,
        {
          browserPolyfill,
          crossBrowser,
          dynamicImportWrapper,
          firstClassManifest,
          iifeJsonPaths,
          publicKey,
          contentScriptWrapper,
          wrapContentScripts,
          verbose,
        },
        cache,
      )

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
            fileName: path.relative(cache.srcDir, srcPath),
          }
        }),
      )

      assets.forEach((asset) => {
        this.emitFile(asset)
      })

      /* ------------------ EMIT CHUNKS ------------------ */

      cache.contentScripts.forEach((id) => {
        const { jsFileName } = generateFileNames({
          srcDir: cache.srcDir,
          id,
        })

        this.emitFile({
          type: 'chunk',
          fileName: jsFileName,
          id,
        })
      })

      cache.background.forEach((id) => {
        const { fileName, wrapperFileName, jsFileName } =
          generateFileNames({
            srcDir: cache.srcDir,
            id,
          })

        const server = getViteServer()
        if (!server) {
          this.emitFile({
            type: 'chunk',
            fileName: jsFileName,
            id,
          })

          if (isMV3(cache.manifest)) return
        }

        const importPath = JSON.stringify(
          server
            ? `${VITE_SERVER_URL}/${fileName}`
            : `./${jsFileName}`,
        )
        const source = isMV2(cache.manifest)
          ? backgroundScriptWrapper
          : 'import %PATH%'
        this.emitFile({
          type: 'asset',
          fileName: wrapperFileName,
          source: source.replace('%PATH%', importPath),
        })
      })

      /* ----------------- EMIT MANIFEST ----------------- */

      const manifestBody = updateManifest(cache.manifest!)
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

    async resolveId(source) {
      return source === stubIdForNoScriptChromeExtensions
        ? source
        : null
    },

    load(id) {
      if (id === stubIdForNoScriptChromeExtensions) {
        return {
          code: `console.log(${stubIdForNoScriptChromeExtensions})`,
        }
      }

      return null
    },

    /* ------------ DERIVE PERMISSIONS START ----------- */
    // TODO: add permissions detection to this build step
    // - if serve, use transform (accuracy doesn't matter)
    // - if build, use renderChunk (accuracy does matter)
    // TODO: use this.setAssetSource to update the manifest
    // IDEA: log data like this https://github.com/yousifalraheem/rollup-plugin-summary/blob/75760f53bc7066efa87e3b32171b47f93e7d149f/index.js#L210-L226
    // transform() {
    //   let permissions: string[] = []
    //   // Get module ids for all chunks
    //   if (cache.assetChanged && cache.permsHash) {
    //     // Permissions did not change
    //     permissions = JSON.parse(cache.permsHash) as string[]

    //     cache.assetChanged = false
    //   } else {
    //     const chunks = Object.values(bundle).filter(isChunk)

    //     // Permissions may have changed
    //     permissions = Array.from(
    //       chunks.reduce(derivePermissions, new Set<string>()),
    //     )

    //     const permsHash = JSON.stringify(permissions)

    //     if (verbose && permissions.length) {
    //       if (!cache.permsHash) {
    //         this.warn(
    //           `Detected permissions: ${permissions.toString()}`,
    //         )
    //       } else if (permsHash !== cache.permsHash) {
    //         this.warn(
    //           `Detected new permissions: ${permissions.toString()}`,
    //         )
    //       }
    //     }

    //     cache.permsHash = permsHash
    //   }
    // },

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

    outputOptions(options) {
      // Entries must be in original location
      return {
        ...options,
        assetFileNames,
        chunkFileNames,
        entryFileNames,
      }
    },

    async generateBundle(options, bundle) {
      // Clean up stub
      delete bundle[stubIdForNoScriptChromeExtensions + '.js']

      // The bundle has to have something in it
      if (Object.keys(bundle).length === 0) {
        throw new Error(
          'The Chrome extension must have at least one asset (html or css) or script file.',
        )
      }

      // Regenerate content scripts as IIFE
      const contentScriptJsFileNames = cache.contentScripts.map(
        (id) =>
          generateFileNames({
            srcDir: cache.srcDir,
            id,
          }).jsFileName,
      )

      const contentScripts = await Promise.all(
        contentScriptJsFileNames.map((input) =>
          regenerateBundle
            .call(
              this,
              {
                input,
                output: {
                  format: 'iife',
                  sourcemap: options.sourcemap,
                  chunkFileNames,
                  entryFileNames,
                },
              },
              bundle,
            )
            // Rollup strips the dir from the output file name
            .then((b) => {
              // These vars are easier to debug
              const chunks = Object.values(b)
              const result = {
                [input]: { ...chunks[0], fileName: input },
              }
              return result
            }),
        ),
      )

      const iifeBundle = Object.assign({}, ...contentScripts)

      const esmInputs = Object.entries(bundle)
        .filter(([, file]) => {
          return (
            isChunk(file) &&
            file.isEntry &&
            !contentScriptJsFileNames.includes(file.fileName)
          )
        })
        .map(([key]) => key)

      // Regenerate everything else as a new ESM bundle
      const esmBundle = await regenerateBundle.call(
        this,
        {
          input: esmInputs,
          output: {
            format: 'esm',
            sourcemap: options.sourcemap,
            chunkFileNames,
            entryFileNames,
          },
        },
        bundle,
      )

      // Remove the original chunks
      Object.entries(bundle)
        .filter(([, v]) => isChunk(v))
        .forEach(([key]) => {
          delete bundle[key]
        })

      // Refill bundle with our new mixed format files
      Object.assign(bundle, esmBundle, iifeBundle)
    },
  }
}

export default manifestInput
