import { promises as fs } from 'fs'
import MagicString from 'magic-string'
import { PreRenderedAsset, PreRenderedChunk } from 'rollup'
import { TransformResult, ViteDevServer } from 'vite'
import {
  fileById,
  idBySource,
  ownerById,
  setFileMeta,
  setOutputMeta,
  setOwnerMeta,
  setUrlMeta,
  transformResultByOwner,
  urlById,
} from './fileMeta'
import { createHash, isTruthy, _debug } from './helpers'
import { relative } from './path'
import { CrxPluginFn } from './types'
import {
  customElementsId,
  reactRefreshId,
  viteClientId,
} from './virtualFileIds'
const { readFile } = fs

const debug = _debug('file-writer').extend('chunks')

/* ----------------- INIT URL META ----------------- */

for (const source of [viteClientId, customElementsId]) {
  setUrlMeta(sourceToUrlMeta(source))
}
setUrlMeta({
  source: reactRefreshId,
  id: '/react-refresh',
  url: reactRefreshId,
})

export function sourceToUrlMeta(source: string) {
  const [p, query = ''] = source.split('?')

  // server.transformRequest doesn't work with /@id/ or /@fs/ urls
  const pathname = p.replace(/^\/@id\//, '').replace(/^\/@fs/, '')
  const url = [pathname, query].filter(isTruthy).join('?')

  // differentiate multiple output files for SFC's (template, styles, etc)
  const hash = createHash(url)

  const base = p.split('/').slice(-4).filter(isTruthy).join('-')
  // output.entryFileNames does not override folders; ids need to be root level
  const id = `/${base}-${hash}.js`.replace(/[@]/g, '')

  return { id, url, source }
}

/**
 * ### Constraints
 *
 * Vite (especially Vue) HMR depends on preserving default exports and export names.
 *
 * - `manualChunks` doesn't preserve the module signature
 * - `preserveModules` runs the risk of creating the folder `_virtual`, an illegal
 *   filenames for Chrome Extensions
 * - `this.emitFile` preserves the module signature, but we need to know if the
 *   file should be split before we load it.
 *
 * ### Notes
 *
 * With `preserveModules`, Rollup prepends the id dirname to the return value of
 * `entryFileNames`, which can result in a strange file structure. By using
 * root-level synthetic ids, we can gain complete control of filenames.
 *
 * We might explore `this.emitFile` later, but in the interests of time I'm
 * going with `preserveModules` for now.
 */
export const pluginFileWriterChunks: CrxPluginFn = () => {
  let server: ViteDevServer

  return {
    name: 'crx:file-writer-chunks',
    apply: 'build',
    fileWriterStart(_server) {
      server = _server
    },
    async resolveId(source, importer) {
      if (this.meta.watchMode) {
        if (idBySource.has(source)) {
          const id = idBySource.get(source)!
          debug(`resolved cached ${source} -> ${id}`)
          return id
        } else if (importer) {
          const meta = sourceToUrlMeta(source)
          setUrlMeta(meta)
          const { id } = meta
          debug(`resolved ${source} -> ${id}`)
          return id
        } else {
          const [rawUrl] = await server.moduleGraph.resolveUrl(source)
          const name = rawUrl.split('/').join('-').replace(/^-/, '')
          const url = rawUrl.startsWith('/') ? rawUrl : `/${rawUrl}`
          const id = `/${name}-${createHash(url)}.js`
          setUrlMeta({ url, id, source })
          debug(`resolved entry ${source} -> ${id}`)
          return id
        }
      }
    },
    async load(id) {
      if (this.meta.watchMode && urlById.has(id)) {
        const url = urlById.get(id)!

        let serverModule = await server.moduleGraph.getModuleByUrl(url)
        let transformResult: TransformResult | null = null
        if (!serverModule) {
          // first time, always transform
          transformResult = await server.transformRequest(url)
          serverModule = await server.moduleGraph.getModuleByUrl(url)
        }
        if (!serverModule)
          throw new Error(`Unable to load "${url}" from server.`)
        const { file, url: owner } = serverModule

        // use cached result if available
        transformResult =
          transformResult ??
          transformResultByOwner.get(owner) ??
          serverModule.transformResult
        if (!transformResult)
          transformResult = await server.transformRequest(url)
        if (!transformResult)
          throw new TypeError(`Unable to load "${url}" from server.`)
        transformResultByOwner.set(owner, transformResult)

        if (file) {
          setFileMeta({ id, file })
          this.addWatchFile(file)
          if (urlById.get(id)!.includes('?import'))
            this.emitFile({
              type: 'asset',
              fileName: relative(server.config.root, file),
              source: await readFile(file),
            })
        }
        if (url) setOwnerMeta({ id, owner })

        // debug('start "%s"', url)
        // debug('---------------------')
        // for (const l of transformResult.code.split('\n')) debug('| %s', l)
        // debug('---------------------')
        // debug('end "%s"', url)

        return { code: transformResult.code, map: transformResult.map }
      }

      return null
    },
    outputOptions(options) {
      const cacheDir = relative(server.config.root, server.config.cacheDir)
      const fileNameById = new Map<string, string>()
      fileNameById.set('/react-refresh', 'vendor/react-refresh.js')

      function fileNames(info: PreRenderedChunk | PreRenderedAsset) {
        const id = info.type === 'chunk' ? info.facadeModuleId : info.name
        if (id && fileNameById.has(id)) return fileNameById.get(id)!

        let fileName =
          info.type === 'chunk' ? 'assets/[name].js' : 'assets/[name].[ext]'
        if (id && fileById.has(id)) {
          fileName = fileById.get(id)!
          const url = new URL(urlById.get(id)!, 'stub://stub')
          // support vue sfc
          if (url.searchParams.has('type'))
            fileName += `.${url.searchParams.get('type')}`
          // support vue sfc
          if (url.searchParams.has('index'))
            fileName += `.${url.searchParams.get('index')}`
        }
        if (id?.startsWith('/@crx/'))
          fileName = `vendor/${id.slice('/@crx/'.length).split('/').join('-')}`

        if (fileName.startsWith(server.config.root))
          fileName = fileName.slice(server.config.root.length + 1)
        if (fileName.startsWith(cacheDir))
          fileName = `vendor/${fileName.slice(cacheDir.length + 1)}`

        if (fileName.includes('/node_modules/'))
          fileName = `vendor/${fileName
            .split('/node_modules/')
            .pop()!
            .split('/')
            .join('-')
            .replace('vite-dist-client', 'vite')}`

        if (fileName.startsWith('/')) fileName = fileName.slice(1)
        if (!fileName.endsWith('.js')) fileName += '.js'
        if (id) fileNameById.set(id, fileName)

        fileName = fileName
          .replace(/:/g, '-') // some virtual files
          .replace(/@/, '') // no @xyz/ folders

        return fileName
      }

      return {
        ...options,
        preserveModules: true,
        assetFileNames: fileNames,
        entryFileNames: fileNames,
      }
    },
    generateBundle(options, bundle) {
      for (const chunk of Object.values(bundle))
        if (chunk.type === 'chunk') {
          const { facadeModuleId: id, modules, code, fileName } = chunk
          if (!id || Object.keys(modules).length !== 1) continue

          const url = urlById.get(id)!
          if (url === viteClientId) continue

          const ownerPath = ownerById.get(id)
          if (!ownerPath) continue

          const index = code.indexOf('createHotContext(')
          if (index === -1) continue

          const start = code.indexOf(ownerPath, index)
          const end = start + ownerPath.length
          if (start > 0) {
            const outputName = `/${fileName}`
            setOutputMeta({ id, output: outputName })

            const magic = new MagicString(code)
            magic.overwrite(start, end, outputName)
            chunk.code = magic.toString()
          }
        }
    },
  }
}
