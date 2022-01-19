import CSP from 'csp-dev'
import { set } from 'lodash'
import { PluginContext } from 'rollup'
import { Interpreter } from 'xstate'
import type { machine as filesMachine } from './files.machine'
import { join, parse } from './path'
import {
  BaseAsset,
  EmittedFile,
  CrxPlugin,
  isMV2,
  Manifest,
  Script,
} from './types'

export const esmImportWrapperFileNameExt = '.esm-wrapper.js'

export const generateFileNames = (fileName: string) => {
  const { dir, name } = parse(fileName)
  const wrapperFileName = join(
    dir,
    name + esmImportWrapperFileNameExt,
  )
  const outputFileName = join(dir, name + '.js')

  return { outputFileName, wrapperFileName }
}

export const isRPCE = (
  p: CrxPlugin | null | false | undefined,
) => !!(p && p.name === 'chrome-extension')

export type RpceApi = {
  /** A map of the emitted files by fileName */
  files: Map<string, EmittedFile>
  /** Returns a map of the newly emitted files */
  addFiles: (
    this: PluginContext,
    files: (BaseAsset | Script)[],
    command: 'build' | 'serve',
  ) => Promise<Map<string, EmittedFile>>
  /** The updated root folder, derived from either the Vite config or the manifest dirname */
  readonly root: string
  /** The files service, used to send events from other plugins */
  service: Interpreter<typeof filesMachine>
}

export function getRpceAPI(
  plugins: readonly CrxPlugin[],
): RpceApi {
  const api = plugins.find(isRPCE)?.api
  if (!api) throw new Error('Could not get RPCE API')
  return api
}

const defaultSrc = ['self']
export function addToCspScriptSrc(
  manifest: Manifest,
  srcs: string[],
): Manifest {
  const csp = isMV2(manifest)
    ? manifest.content_security_policy
    : manifest.content_security_policy?.extension_pages
  const parser = new CSP(csp)
  const scriptSrc =
    parser.share('json')['script-src'] ?? defaultSrc
  const objectSrc =
    parser.share('json')['object-src'] ?? defaultSrc

  parser.newDirective('script-src', [...scriptSrc, ...srcs])
  parser.newDirective('object-src', objectSrc)

  const result = parser.share('string')

  if (isMV2(manifest)) {
    set(manifest, 'content_security_policy', result)
  } else {
    set(
      manifest,
      'content_security_policy.extension_pages',
      result,
    )
  }

  return manifest
}

/** Work with an id as a URL instance */
export const stubUrl = (id = '') => {
  return new URL(id, 'stub://stub')
}

export function splitPlugins(plugins: CrxPlugin[]) {
  const pre: CrxPlugin[] = []
  const mid: CrxPlugin[] = []
  const post: CrxPlugin[] = []
  for (const p of plugins) {
    if (p.enforce === 'pre') pre.push(p)
    else if (p.enforce === 'post') post.push(p)
    else mid.push(p)
  }
  return { pre, mid, post }
}

export function combinePlugins(
  pluginsA: CrxPlugin[],
  pluginsB: CrxPlugin[],
) {
  const a = splitPlugins(pluginsA)
  const b = splitPlugins(pluginsB)

  return [
    ...a.pre,
    ...b.pre,
    ...a.mid,
    ...b.mid,
    ...a.post,
    ...b.post,
  ]
}
