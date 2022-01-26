import { set } from 'lodash'
import { OutputAsset, OutputBundle, OutputChunk } from 'rollup'
import type {
  Manifest as ViteFilesManifest,
  ManifestChunk,
} from 'vite'
import { isChunk } from './helpers'
import { relative } from './path'
import { helperScripts } from './plugin-contentScriptESM'
import { importedResourcePrefix } from './plugin-importedResources'
import {
  generateFileNames,
  getRpceAPI,
  RpceApi,
  stubUrl,
} from './plugin_helpers'
import {
  ChromeExtensionOptions,
  CrxPlugin,
  isMV2,
  Manifest,
} from './types'

// recurse through content script imports
type Resources = {
  assets: Set<string>
  css: Set<string>
  imports: Set<string>
}

/**
 * Content script resources like CSS and image files must be declared
 * in the manifest under `web_accessible_resources`. MV3 uses a match pattern
 * to narrow the origins that can access a Chrome Extension resource.
 *
 * Content scripts declared in the manifest use the same match pattern
 * as the content script for web accessible resources. Dynamic content scripts
 * use the default `["http://*\/*", "https://*\/*"]`, but you can add this
 * placeholder to a `web_accessible_resources` entry in an MV3 manifest
 * to narrow the match pattern for dynamic content script resources:
 *
 * ```json
 * {
 *   "web_accessible_resources": [{
 *     "resources": ["<dynamic_scripts>"],
 *     "matches": ["https://google.com/*", "file:///*.mp3", "..."]
 *   }]
 * }
 * ```
 */
export const dynamicScriptPlaceholder = '<dynamic_scripts>'

function getChunksById(bundle: OutputBundle) {
  return Object.entries(bundle).reduce(
    (map, [outputName, chunk]) => {
      if (isChunk(chunk) && chunk.facadeModuleId)
        map.set(chunk.facadeModuleId, outputName)
      return map
    },
    new Map<string, string>(),
  )
}

function getCrxImportsFromBundle(
  { modules, imports, dynamicImports }: OutputChunk,
  chunksById: Map<string, string>,
  { root }: RpceApi,
) {
  const resources = Object.keys(modules)
    .filter((m) => m.startsWith(importedResourcePrefix))
    .map((m) => m.slice(importedResourcePrefix.length))
    .map((m) => stubUrl(m).pathname)

  const chunks = [...imports, ...dynamicImports]
  const assets = []
  for (const id of resources) {
    const chunk = chunksById.get(id)
    if (chunk) chunks.push(chunk)
    else assets.push(relative(root, id))
  }

  return { chunks, assets }
}

/**
 * Dynamic content script strategy
 *
 * Imported CSS in dynamic content script:
 * - add file to web_accessible_resources
 * - add client code to importer
 *   - create style tag
 *   - support css modules
 *   - support HMR for css
 *
 * Use Cases:
 * - imported script is executed by a background page
 *   - importer is SCRIPT_BACKGROUND
 * - imported script is executed by a script on an HTML page
 *   - importer is SCRIPT_HTML
 * - imported script is executed by a script in main world
 *   - importer is SCRIPT_DYNAMIC or SCRIPT_DECLARED
 *   - is included in importer resources
 *   - covered by `getResources`
 *
 * Strategy:
 * - correlate emitted files to bundle chunks
 * - find imported scripts in those chunks
 * - run `getResources`
 * - MV2: just add the resources to web_accessible_resources
 * - MV3: use special placeholder in web_accessible_resources#resources
 *   - eg, "<dynamic_scripts>"
 *   - warn if placeholder is not found
 *   - could support a list of match patterns if needed
 *     - should be relative to root
 *     - eg, "<dynamic_scripts>:src/script1.ts,src/scripts/*.ts"
 *
 * ```jsonc
 * {
 *   web_accessible_resources: [{
 *     resources: ["<dynamic_scripts>"],
 *     matches: ["https://*", "file:///*.mp3", "..."]
 *   }]
 * }
 * ```
 */
function updateContentScriptResources(
  api: RpceApi,
  manifest: Manifest,
  isESM: boolean,
  /** Recursively gets script imports */
  getResources: (name: string) => Resources,
): Manifest {
  // set default value
  manifest.web_accessible_resources =
    manifest.web_accessible_resources ?? []

  // update declared scripts resources
  const mainWorldScripts = new Set<string>()
  for (const script of manifest.content_scripts ?? []) {
    for (const name of script.js ?? []) {
      if (helperScripts.includes(name)) continue

      const { assets, css, imports } = getResources(name)

      for (const i of imports) {
        const file = api.filesByFileName.get(i)
        if (file?.fileType === 'SCRIPT_DYNAMIC') {
          mainWorldScripts.add(file.fileName)
        }
      }

      const { outputFileName } = generateFileNames(name)

      if (isESM) imports.add(outputFileName)

      if (css.size) {
        script.css = script.css ?? []
        script.css.push(...css)
      }

      if (assets.size + imports.size) {
        if (isMV2(manifest)) {
          manifest.web_accessible_resources?.push(
            ...assets,
            ...imports,
          )
        } else {
          manifest.web_accessible_resources?.push({
            // script.matches is always defined
            matches: script.matches!,
            resources: [...assets, ...imports],
          })
        }
      }
    }
  }

  // update dynamic script resources
  // - exclude main world scripts used by declared scripts
  const dynamicResources = new Set<string>()
  for (const file of api.filesByFileName.values()) {
    if (
      file.fileType === 'SCRIPT_DYNAMIC' &&
      !mainWorldScripts.has(file.fileName)
    ) {
      const { assets, css, imports } = getResources(
        file.fileName,
      )

      if (isESM) dynamicResources.add(file.fileName)
      for (const a of assets) dynamicResources.add(a)
      for (const c of css) dynamicResources.add(c)
      for (const i of imports) dynamicResources.add(i)
    }
  }

  // update manifest.web_accessible_resources
  if (dynamicResources.size) {
    if (isMV2(manifest)) {
      manifest.web_accessible_resources!.push(
        ...dynamicResources,
      )
    } else {
      let resource = manifest.web_accessible_resources!.find(
        ({ resources: [r] }) => r === dynamicScriptPlaceholder,
      )
      if (!resource) {
        resource = {
          resources: [dynamicScriptPlaceholder],
          matches: ['http://*/*', 'https://*/*'],
        }
        manifest.web_accessible_resources!.push(resource)
      }

      resource.resources = [...dynamicResources]
    }
  }

  // clean up manifest
  if (!manifest.web_accessible_resources?.length) {
    // array is empty or undefined
    delete manifest.web_accessible_resources
  } else if (isMV2(manifest)) {
    // remove duplicates
    manifest.web_accessible_resources = [
      ...new Set(manifest.web_accessible_resources),
    ]
  } else {
    // remove duplicate match patterns
    const map = new Map<string, Set<string>>()
    for (const {
      matches,
      resources,
    } of manifest.web_accessible_resources!) {
      const key = JSON.stringify(matches.sort())
      const set = map.get(key) ?? new Set()
      resources.forEach((r) => set.add(r))
      map.set(key, set)
    }
    manifest.web_accessible_resources = [...map].map(
      ([key, set]) => ({
        matches: JSON.parse(key),
        resources: [...set],
      }),
    )
  }

  return manifest
}

/**
 * Handles imported resources for content scripts.
 * - Supports both declared and dynamic content scripts
 * - Adds imported CSS files to content scripts in manifest
 * - Adds imported assets and scripts to web_accessible_resources
 */
export const contentScriptResources = ({
  contentScriptFormat,
}: ChromeExtensionOptions): CrxPlugin => {
  let isVite: boolean
  let api: RpceApi
  return {
    name: 'content-script-resources',
    apply: 'build',
    config(config) {
      isVite = true
      set(config, 'build.manifest', true)
      return config
    },
    configResolved({ plugins }) {
      api = getRpceAPI(plugins)
      const viteManifest = plugins.find(
        ({ name }) => name === 'vite:manifest',
      )!

      const realHook = viteManifest.generateBundle!
      viteManifest.generateBundle = async function (
        options,
        bundle,
        isWrite,
      ) {
        if (this.meta.watchMode) return

        /* ---------------- VITE BUILD ONLY ---------------- */
        // generates a very specific resource list
        let filesData: ViteFilesManifest
        await realHook.call(
          {
            ...this,
            /**
             *  we don't want vite:manifest to actually emit a manifest
             *  it would conflict with the crx manifest 💥
             *  vite:manifest doesn't use the return value of emitFile
             *  https://github.com/vitejs/vite/blob/aab303f7bd333307c77363259f97a310762c4848/packages/vite/src/node/plugins/manifest.ts#L114-L119
             */
            emitFile: (file) => {
              if (file.type === 'chunk') return 'chunk id'
              filesData = JSON.parse(file.source as string)
              return 'asset id'
            },
          },
          options,
          bundle,
          isWrite,
        )

        const files = Object.entries(filesData!)
        if (!files.length) return

        const filesByName = files.reduce(
          (map, [, file]) => map.set(file.file, file),
          new Map<string, ManifestChunk>(),
        )
        const chunksById = getChunksById(bundle)
        const getResources = (
          name: string,
          sets: Resources = {
            assets: new Set(),
            css: new Set(),
            imports: new Set(),
          },
        ): Resources => {
          const {
            assets = [],
            css = [],
            dynamicImports = [],
            imports = [],
            file,
          } = filesByName.get(name) ?? // lookup by output filename
          filesData[name] ?? // lookup by vite manifest import key
          ({} as ViteFilesManifest) // if script is OutputAsset

          const chunk = bundle[file]
          const crxImports = isChunk(chunk)
            ? getCrxImportsFromBundle(chunk, chunksById, api)
            : { chunks: [], assets: [] }

          for (const a of [...assets, ...crxImports.assets])
            sets.assets.add(a)
          for (const c of css) sets.css.add(c)
          for (const key of [...dynamicImports, ...imports]) {
            const i = filesData[key].file
            sets.imports.add(i)
            getResources(key, sets)
          }
          for (const chunk of crxImports.chunks) {
            sets.imports.add(chunk)
            getResources(chunk, sets)
          }

          return sets
        }

        const manifestAsset = bundle[
          'manifest.json'
        ] as OutputAsset
        const manifest: Manifest = JSON.parse(
          manifestAsset.source as string,
        )
        const result = updateContentScriptResources(
          api,
          manifest,
          contentScriptFormat === 'esm',
          getResources,
        )
        manifestAsset.source = JSON.stringify(result)
      }
    },
    buildStart({ plugins }) {
      if (isVite) return

      api = getRpceAPI(plugins)
    },
    generateBundle(options, bundle) {
      if (this.meta.watchMode) {
        /* ---------- VITE SERVE AND ROLLUP WATCH ---------- */
        // use generic resources for file writer / watch mode

        const manifestAsset = bundle[
          'manifest.json'
        ] as OutputAsset
        const manifest: Manifest = JSON.parse(
          manifestAsset.source as string,
        )

        manifest.web_accessible_resources =
          manifest.web_accessible_resources ?? []
        if (isMV2(manifest)) {
          manifest.web_accessible_resources!.push('**/*', '*')
        } else {
          manifest.web_accessible_resources!.push({
            matches: ['<all_urls>'],
            resources: ['**/*', '*'],
            // @ts-expect-error @types/chrome is out of date
            use_dynamic_url: true,
          })
        }

        manifestAsset.source = JSON.stringify(manifest)
      }

      if (isVite) return

      /* --------------- ROLLUP BUILD ONLY --------------- */
      // rollup doesn't support static asset imports

      const chunksById = getChunksById(bundle)
      const getResources = (
        name: string,
        sets: Resources = {
          assets: new Set(),
          css: new Set(),
          imports: new Set(),
        },
      ): Resources => {
        const { outputFileName } = generateFileNames(name)
        const chunk = bundle[outputFileName]
        const { assets, chunks } = isChunk(chunk)
          ? getCrxImportsFromBundle(chunk, chunksById, api)
          : { chunks: [], assets: [] }

        for (const a of assets) sets.assets.add(a)
        for (const chunk of chunks) {
          sets.imports.add(chunk)
          getResources(chunk, sets)
        }

        return sets
      }

      const manifestAsset = bundle[
        'manifest.json'
      ] as OutputAsset
      const manifest: Manifest = JSON.parse(
        manifestAsset.source as string,
      )
      const result = updateContentScriptResources(
        api,
        manifest,
        contentScriptFormat === 'esm',
        getResources,
      )
      manifestAsset.source = JSON.stringify(result)
    },
  }
}
