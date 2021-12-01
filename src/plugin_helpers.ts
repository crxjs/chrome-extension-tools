import CSP from 'csp-dev'
import { set } from 'lodash'
import { Interpreter } from 'xstate'
import type { machine as filesMachine } from './files.machine'
import { join, parse } from './path'
import {
  CompleteFile,
  CrxPlugin,
  isMV2,
  Manifest,
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
  /** A map of the emitted files */
  files: Map<
    string,
    CompleteFile & {
      source?: string | Uint8Array | undefined
    }
  >
  /** The updated root folder, derived from either the Vite config or the manifest dirname */
  readonly root: string
  /** The files service, used to send events from other plugins */
  service: Interpreter<typeof filesMachine>
}

export function getRpceAPI(
  plugins: readonly CrxPlugin[],
): RpceApi | undefined {
  return plugins.find(isRPCE)?.api
}

/**
 * Sorts plugins into categories by `plugin.crx` and `plugin.enforce`
 * RPCE is not a CrxPlugin itself, so it is included in `basePlugins`
 */
export function categorizePlugins(plugins: CrxPlugin[]): {
  basePlugins: CrxPlugin[]
  prePlugins: CrxPlugin[]
  postPlugins: CrxPlugin[]
  normalPlugins: CrxPlugin[]
} {
  const basePlugins: CrxPlugin[] = []
  const prePlugins: CrxPlugin[] = []
  const postPlugins: CrxPlugin[] = []
  const normalPlugins: CrxPlugin[] = []
  for (const p of plugins) {
    if (!p.crx) basePlugins.push(p)
    else if (p.enforce === 'pre') prePlugins.push(p)
    else if (p.enforce === 'post') postPlugins.push(p)
    else normalPlugins.push(p)
  }

  return {
    basePlugins,
    prePlugins,
    postPlugins,
    normalPlugins,
  }
}

export function combinePlugins(
  basePlugins: CrxPlugin[],
  crxPlugins: CrxPlugin[],
): CrxPlugin[] {
  const baseRpceIndex = basePlugins.findIndex(isRPCE)
  if (baseRpceIndex < 0)
    throw new Error('Could not find base RPCE plugin')

  const { normalPlugins, postPlugins, prePlugins } =
    categorizePlugins(crxPlugins)

  const result: CrxPlugin[] = [...basePlugins]
  // Add normal crx plugins
  result.splice(baseRpceIndex + 1, 0, ...normalPlugins)
  // Add pre crx plugins
  result.splice(1, 0, ...prePlugins)
  // Add post crx plugins
  result.push(...postPlugins)

  return result
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
