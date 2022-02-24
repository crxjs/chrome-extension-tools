import contentDevLoader from 'client/iife/content-dev-loader.ts?client'
import contentProLoader from 'client/iife/content-pro-loader.ts?client'
import * as lexer from 'es-module-lexer'
import fs from 'fs'
import jsesc from 'jsesc'
import MagicString from 'magic-string'
import { ViteDevServer } from 'vite'
import { defineClientValues } from './defineClientValues'
import { dirname, join, parse, relative, resolve } from './path'
import { rebuildFiles } from './plugin-fileWriter'
import type { CrxPluginFn } from './types'

// const cssLangs = `\\.(css|less|sass|scss|styl|stylus|pcss|postcss)($|\\?)`
// const cssLangRE = new RegExp(cssLangs)
// const isCSSLang = (id: string): boolean => cssLangRE.test(id)
const scriptRE = /\.[jt]sx?$/s
const isScript = (s: string) => !s.startsWith('crx:') || scriptRE.test(s)

/** A Map of dynamic scripts from virtual module id to the ref id of the emitted script */
export const dynamicScripts = new Map<
  string,
  {
    /** The file name of the source file */
    id: string
    /** The output file name of the content script entry (could be loader script) */
    fileName?: string
    /** TODO: unimplemented IIFE format */
    type?: 'module' | 'iife' | 'main'
    /** The ref id of the output file */
    refId?: string
  }
>()

function resolveScript({
  source,
  importer,
  root,
}: {
  source: string
  importer: string
  root: string
}): {
  scriptId: string
  id: string
  type: 'module' | 'iife' | 'main'
} {
  const [preId, query] = source.split('?')
  const [, type = 'module'] = query.split('&')
  const resolved = resolve(dirname(importer), preId)
  const id = parse(resolved).ext
    ? resolved
    : ['.ts', '.tsx', '.js', '.jsx', '.mjs']
        .map((x) => resolved + x)
        .find((x) => fs.existsSync(x)) ?? resolved
  const relId = relative(root, id)
  const scriptId = `${pluginName}::${relId}`
  return { scriptId, id, type: type as 'module' | 'iife' | 'main' }
}

const preambleId = '@crx/content-scripts/preamble'

const pluginName = 'crx:content-scripts'
export const pluginContentScripts: CrxPluginFn = ({
  contentScripts: options = {},
}) => {
  let root: string
  let port: string
  let { preambleCode } = options
  let preambleRefId: string
  let contentClientRefId: string
  let server: ViteDevServer

  return [
    {
      name: `${pluginName}-serve-dynamic`,
      apply: 'serve',
      enforce: 'pre',
      configResolved(config) {
        root = config.root
      },
      resolveId(source, importer) {
        if (importer && source.includes('?script')) {
          const { scriptId, id, type } = resolveScript({
            source,
            importer,
            root,
          })
          const script = dynamicScripts.get(scriptId)
          if (!script) dynamicScripts.set(scriptId, { id, type })
          return scriptId
        }

        return null
      },
      async load(scriptId) {
        const script = dynamicScripts.get(scriptId)
        if (script) {
          if (!script.fileName) await rebuildFiles()
          const { fileName } = dynamicScripts.get(scriptId) ?? {}
          if (!fileName)
            throw new Error(
              'dynamic script filename is undefined. this is a bug, please report it to rollup-plugin-chrome-extension',
            )
          return `export default "${fileName}"`
        }

        return null
      },
    },
    {
      name: `${pluginName}-pre-build`,
      apply: 'build',
      enforce: 'pre',
      configResolved(config) {
        root = config.root
      },
      async buildStart() {
        // emit dynamic scripts
        for (const [scriptId, { id, type }] of dynamicScripts) {
          const refId = this.emitFile({
            type: 'chunk',
            id,
            name: parse(id).base,
          })
          dynamicScripts.set(scriptId, { id, refId, type })
        }

        // emit preamble, if defined
        if (this.meta.watchMode) {
          // simplify config for react users
          if (typeof preambleCode === 'undefined') {
            try {
              // jest doesn't work w/ dynamic import, see https://github.com/nodejs/node/issues/35889
              const react =
                process.env.NODE_ENV === 'test'
                  ? require('@vitejs/plugin-react') // jest needs this
                  : await import('@vitejs/plugin-react') // rollup compiles this correctly for cjs output

              preambleCode = react.default.preambleCode
            } catch (error) {
              preambleCode = false
            }
          }

          if (preambleCode) {
            preambleRefId = this.emitFile({
              type: 'chunk',
              id: preambleId,
              name: 'content-script-preamble.js',
            })
          }
        }
      },
      resolveId(source, importer) {
        if (importer && source.includes('?script')) {
          const { scriptId, id, type } = resolveScript({
            source,
            importer,
            root,
          })
          const script = dynamicScripts.get(scriptId)
          if (!script) dynamicScripts.set(scriptId, { id, type })
          return scriptId
        }

        if (source === preambleId) {
          return defineClientValues(preambleId, server.config)
        }
      },
      async load(scriptId) {
        if (dynamicScripts.has(scriptId)) {
          let { id, refId, type } = dynamicScripts.get(scriptId)!
          if (!refId)
            refId = this.emitFile({
              type: 'chunk',
              id,
              name: parse(id).base,
            })
          dynamicScripts.set(scriptId, { id, refId, type })
          return `export default "%IMPORTED_SCRIPT_${refId}%"`
        }

        if (scriptId === preambleId && typeof preambleCode === 'string') {
          return preambleCode
        }

        return null
      },
    },
    {
      name: `${pluginName}-post-build`,
      apply: 'build',
      enforce: 'post',
      fileWriterStart({ port: p }) {
        port = p.toString()
      },
      transformCrxManifest(manifest) {
        if (this.meta.watchMode) {
          const scriptCount =
            manifest.content_scripts?.length ?? 0 + dynamicScripts.size
          if (this.meta.watchMode && scriptCount) {
            contentClientRefId = this.emitFile({
              type: 'chunk',
              id: '@crx/client',
              name: 'content-script-hmr-client.js',
            })
          }
        }
        return null
      },
      renderCrxManifest(manifest, bundle) {
        if (this.meta.watchMode && typeof port === 'undefined')
          throw new Error('server port is undefined')

        const preambleName = preambleRefId
          ? this.getFileName(preambleRefId)
          : ''
        const contentClientName = contentClientRefId
          ? this.getFileName(contentClientRefId)
          : ''

        /* ---------------- DYNAMIC SCRIPTS ---------------- */

        for (const [name, { id, refId, type }] of dynamicScripts) {
          if (!refId) continue // may have been added during build

          const scriptName = this.getFileName(refId)

          let loaderRefId: string | undefined
          if (type === 'iife') {
            // TODO: rebundle as iife script for opaque origins
          } else if (type === 'main') {
            // TODO: main world scripts don't need a loader
          } else if (type === 'module') {
            const source = this.meta.watchMode
              ? contentDevLoader
                  .replace(/__PREAMBLE__/g, JSON.stringify(preambleName))
                  .replace(/__CLIENT__/g, JSON.stringify(contentClientName)!)
                  .replace(/__SCRIPT__/g, JSON.stringify(scriptName))
              : contentProLoader.replace(
                  /__SCRIPT__/g,
                  JSON.stringify(scriptName),
                )

            loaderRefId = this.emitFile({
              type: 'asset',
              name: `content-script-loader.${parse(scriptName).name}.js`,
              source,
            })
          } else {
            throw new Error(`Unknown script type: "${type}" (${id})`)
          }

          dynamicScripts.set(name, {
            id,
            fileName: this.getFileName(loaderRefId ?? refId),
            refId,
            type,
          })
        }

        for (const chunk of Object.values(bundle)) {
          if (chunk.type === 'chunk')
            for (const [name, { fileName, refId }] of dynamicScripts) {
              if (chunk.modules[name])
                if (fileName && refId) {
                  const placeholder = `%IMPORTED_SCRIPT_${refId}%`
                  const index = chunk.code.indexOf(placeholder)
                  const magic = new MagicString(chunk.code)
                  // Overwrite placeholder with filename
                  magic.overwrite(
                    index,
                    index + placeholder.length,
                    jsesc(`/${fileName}`, { quotes: 'double' }),
                  )
                  const replaced = magic.toString()
                  chunk.code = replaced
                  if (chunk.map) chunk.map = magic.generateMap()
                }
            }
        }

        /* ---------------- DECLARED SCRIPTS --------------- */

        manifest.content_scripts = manifest.content_scripts?.map(
          ({ js, ...rest }) => ({
            js: js?.map((f: string) => {
              const name = `content-script-loader.${parse(f).name}.js`
              const source = this.meta.watchMode
                ? contentDevLoader
                    .replace(/__PREAMBLE__/g, JSON.stringify(preambleName))
                    .replace(/__CLIENT__/g, JSON.stringify(contentClientName)!)
                    .replace(/__SCRIPT__/g, JSON.stringify(f))
                : contentProLoader.replace(/__SCRIPT__/g, JSON.stringify(f))

              const refId = this.emitFile({
                type: 'asset',
                name,
                source,
              })

              return this.getFileName(refId)
            }),
            ...rest,
          }),
        )

        return manifest
      },
    },
    {
      name: `${pluginName}-dev-loader`,
      apply: 'build',
      async fileWriterStart(config, _server) {
        server = _server
        await lexer.init
      },
      async resolveId(source, importer) {
        if (this.meta.watchMode)
          if (source.includes('?import')) {
            // TODO: split this out into own file writer plugin
            // static asset, export default filename
            return join(server.config.root, source.split('?')[0])
          } else if (source.startsWith('@crx/content-scripts')) {
            // emitted chunk, set file name in generateBundle
            return { id: source, external: true }
          } else if (source === '/@vite/client') {
            // TODO: split this out into own file writer plugin
            // virtual crx module, resolved by other plugin
            return null
          } else if (importer) {
            // imported script file, load though vite dev server
            const info = this.getModuleInfo(importer)
            const { pathname } = new URL(source, 'stub://stub')
            const { dir, name } = parse(pathname)
            if (info?.meta.isScript)
              return {
                id: `\0${join(dir, name + '.js')}`,
                meta: { isScript: true, url: source },
              }
          } else if (isScript(source)) {
            // entry script file, load though vite dev server
            const r = await this.resolve(source, importer, { skipSelf: true })
            if (!r) return null
            const resolved = typeof r === 'string' ? r : r.id
            const url = `/${relative(server.config.root, resolved)}`
            const { dir, name } = parse(resolved)
            return {
              id: `\0${join(dir, name + '.js')}`,
              meta: { isScript: true, url },
            }
          }
      },
      async load(id) {
        if (this.meta.watchMode) {
          const info = this.getModuleInfo(id)
          if (info?.meta.isScript) {
            const { url } = info.meta
            const r = await server.transformRequest(url)
            if (r === null)
              throw new TypeError(`Unable to load "${url}" from server.`)
            return { code: r.code, map: r.map }
          }
        }

        return null
      },
      async transform(code, id) {
        if (this.meta.watchMode) {
          const info = this.getModuleInfo(id)
          if (info?.meta.isScript) {
            const [imports] = lexer.parse(code)
            if (imports.length === 0) return null
            const magic = new MagicString(code)
            const refIds = new Set<string>()
            for (const i of imports)
              if (i.n) {
                if (i.n.startsWith('/@fs')) {
                  continue // should go to vendor
                } else if (i.n.includes('?import')) {
                  continue // is static asset
                } else {
                  // break other files into own chunks
                  const refId = this.emitFile({
                    type: 'chunk',
                    id: i.n,
                    importer: id,
                  })
                  refIds.add(refId)
                  magic.overwrite(i.s, i.e, `@crx/content-scripts/${refId}`)
                }
              }

            return {
              code: magic.toString(),
              map: magic.generateMap(),
              meta: { refIds },
            }
          }
        }
      },
    },
  ]
}
