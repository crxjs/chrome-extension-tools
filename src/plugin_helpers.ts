import { join, parse } from './path'
import { CrxPlugin } from './types'

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

// TODO: replace this with getCrxApi
export function findCrx(
  plugins: readonly CrxPlugin[],
): CrxPlugin | undefined {
  return plugins.find(isRPCE)
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
