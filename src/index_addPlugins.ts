import { autoPerms } from './plugin-autoPerms'
import { backgroundESM_MV2 } from './plugin-backgroundESM_MV2'
import { backgroundESM_MV3 } from './plugin-backgroundESM_MV3'
import { browserPolyfill } from './plugin-browserPolyfill'
import { configureRollupOptions } from './plugin-configureRollupOptions'
import { contentScriptESM } from './plugin-contentScriptESM'
import { contentScriptIIFE } from './plugin-contentScriptIIFE'
import { contentScriptResources } from './plugin-contentScriptResources'
import { extendManifest } from './plugin-extendManifest'
import { htmlMapScriptsToJS } from './plugin-htmlMapScriptsToJS'
import {
  importedResources,
  viteServeImportScripts,
} from './plugin-importedResources'
import { packageJson } from './plugin-packageJson'
import { publicDir } from './plugin-publicDir'
import { rollupVendorsChunk } from './plugin-rollupVendorsChunk'
import { runHijackedHooks } from './plugin-runHijackedHooks'
import { runtimeReloader } from './plugin-runtimeReloader'
import { transformIndexHtml } from './plugin-transformIndexHtml'
import {
  postValidateManifest,
  preValidateManifest,
} from './plugin-validateManifest'
import { viteServeFileWriter } from './plugin-viteServeFileWriter'
import { viteServeHMR_MV2 } from './plugin-viteServeHMR_MV2'
import { viteServeHMR_MV3 } from './plugin-viteServeHMR_MV3'
import { viteServeReactFastRefresh_MV2 } from './plugin-viteServeReactFastRefresh_MV2'
import { viteServeReactFastRefresh_MV3 } from './plugin-viteServeReactFastRefresh_MV3'
import { xstateCompat } from './plugin-xstateCompat'
import { splitPlugins } from './plugin_helpers'
import {
  ChromeExtensionOptions,
  CrxPlugin,
  InternalCrxPlugin,
} from './types'

type CrxPluginFn = (options: ChromeExtensionOptions) => CrxPlugin

export function startBuiltins(
  options: ChromeExtensionOptions,
  command: 'build' | 'serve',
): CrxPlugin[] {
  const pluginFns = [
    xstateCompat,
    viteServeFileWriter,
    packageJson,
    extendManifest,
    autoPerms,
    preValidateManifest,
    backgroundESM_MV2,
    backgroundESM_MV3,
    options.browserPolyfill && browserPolyfill,
    configureRollupOptions,
    transformIndexHtml,
    contentScriptResources,
    importedResources,
    viteServeImportScripts,
    publicDir,
    rollupVendorsChunk,
    htmlMapScriptsToJS,
    options.contentScriptFormat === 'esm'
      ? contentScriptESM
      : contentScriptIIFE,
    viteServeHMR_MV2,
    viteServeHMR_MV3,
    viteServeReactFastRefresh_MV2,
    viteServeReactFastRefresh_MV3,
    runtimeReloader,
    runHijackedHooks,
    postValidateManifest,
  ]

  const builtins = pluginFns
    .filter((fn): fn is CrxPluginFn => typeof fn === 'function')
    .flatMap((fn) => fn(options))
    .filter(({ apply }) => {
      return !apply || apply === command
    })
    .map((p) => ({ ...p, name: `crx:${p.name}` }))

  const { pre, mid, post } = splitPlugins(builtins)
  const sorted = [...pre, ...mid, ...post]
  return sorted
}

/**
 * RPCE runs the CRX manifest and html hooks inside of
 * `buildStart` and `generateBundle`. In order to assert
 * the correct hook order for plugins with these hooks
 * in relation to these CRX specific hooks, we need to
 * hijack the plugin hooks `buildStart` and `generateBundle`
 * and run them in the correct order inside
 * RPCE's repspective hooks
 */
export function hijackHooks(
  plugins: InternalCrxPlugin[],
): InternalCrxPlugin[] {
  const result: InternalCrxPlugin[] = []
  for (const p of plugins) {
    if (!p.crx) {
      result.push(p)
      continue
    }

    const { options, buildStart, generateBundle } = p

    p.crxOptions = options
    p.crxBuildStart = buildStart
    p.crxGenerateBundle = generateBundle

    delete p.options
    delete p.buildStart
    delete p.generateBundle

    result.push(p)
  }
  return result
}
