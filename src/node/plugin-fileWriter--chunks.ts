import hmrClientContent from 'client/es/hmr-client-content.ts?client'
import { readFile } from 'fs-extra'
import MagicString from 'magic-string'
import { TransformResult, ViteDevServer } from 'vite'
import {
  idByUrl,
  ownerById,
  ownersByFile,
  setFileMeta,
  setOutputMeta,
  setOwnerMeta,
  setUrlMeta,
  urlById,
} from './fileMeta'
import { isString, _debug } from './helpers'
import { join, parse, relative } from './path'
import { CrxPluginFn } from './types'
import { contentHmrPortId, viteClientId } from './virtualFileIds'

const debug = _debug('file-writer').extend('chunks')

// const scriptRE = /\.[jt]sx?$/s
// const isScript = (s: string) => scriptRE.test(s)

/** Server.transformRequest doesn't work with /@id/ urls */
const cleanUrl = (url: string) => url.replace(/^\/@id\//, '')

function urlToFileName(source: string) {
  const url = new URL(
    source.replace(':', '.').replace(/^\/@fs/, ''),
    'stub://stub',
  )
  // parsed.ext is always string, don't use ??
  const parsed = parse(url.pathname)
  let ext = parsed.ext || '.js'
  if (url.searchParams.has('vue')) {
    const type = url.searchParams.get('type')
    const index = url.searchParams.get('index')
    ext = `.${[type, index, ext].filter(isString).join('.')}`
  }
  return `${join(parsed.dir, parsed.name)}${ext}`
}

for (const source of [viteClientId]) {
  const url = cleanUrl(source)
  const id = urlToFileName(url)
  setUrlMeta({ url, id })
}

export const pluginFileWriterChunks: CrxPluginFn = () => {
  let server: ViteDevServer
  const ownerToTransformResultMap = new Map<string, TransformResult>()

  return {
    name: 'crx:file-writer-chunks',
    apply: 'build',
    fileWriterStart(_server) {
      server = _server
    },
    async resolveId(_source, importer) {
      if (this.meta.watchMode) {
        const cleaned = cleanUrl(_source)
        let id: string
        if (idByUrl.has(cleaned)) {
          id = idByUrl.get(cleaned)!
          debug(`resolved cached ${cleaned} -> ${id}`)
        } else if (importer) {
          id = urlToFileName(cleaned)
          setUrlMeta({ url: cleaned, id })
          debug(`resolved ${cleaned} -> ${id}`)
        } else {
          const [serverUrl] = await server.moduleGraph.resolveUrl(_source)
          const url = server.config.base + serverUrl
          id = join(server.config.root, serverUrl)
          setUrlMeta({ url, id })
          debug(`resolved entry ${cleaned} -> ${id}`)
        }
        return id
      }
    },
    watchChange(fileName) {
      // dump cached transform results of changed files
      for (const owner of ownersByFile.get(fileName) ?? new Set())
        ownerToTransformResultMap.delete(owner)
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
          ownerToTransformResultMap.get(owner) ??
          serverModule.transformResult
        if (!transformResult)
          transformResult = await server.transformRequest(url)
        if (!transformResult)
          throw new TypeError(`Unable to load "${url}" from server.`)
        ownerToTransformResultMap.set(owner, transformResult)

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
    transform(code, id) {
      if (id === idByUrl.get(viteClientId)) {
        const magic = new MagicString(code)
        magic.prepend(`import { HMRPort } from '${contentHmrPortId}';`)
        const ws = 'new WebSocket'
        const index = code.indexOf(ws)
        magic.overwrite(index, index + ws.length, 'new HMRPort')
        return { code: magic.toString(), map: magic.generateMap() }
      }

      const info = this.getModuleInfo(id)
      if (!id.includes('@') && info?.isEntry) {
        const magic = new MagicString(code)
        magic.append(hmrClientContent)
        return { code: magic.toString(), map: magic.generateMap() }
      }

      return null
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
