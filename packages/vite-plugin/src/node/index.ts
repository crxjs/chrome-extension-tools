import type { PluginOption } from 'vite'
import type { ManifestV3Export } from './defineManifest'
import { pluginOptionsProvider } from './plugin-optionsProvider'
import { pluginBackground } from './plugin-background'
import { pluginContentScripts } from './plugin-contentScripts'
import { pluginContentScriptsCss } from './plugin-contentScripts_css'
import { pluginDeclaredContentScripts } from './plugin-contentScripts_declared'
import { pluginDynamicContentScripts } from './plugin-contentScripts_dynamic'
import { pluginFileWriter } from './plugin-fileWriter'
import { pluginFileWriterPolyfill } from './plugin-fileWriter-polyfill'
import { pluginFileWriterPublic } from './plugin-fileWriter_public'
import { pluginHMR } from './plugin-hmr'
import { pluginHtmlInlineScripts } from './plugin-htmlInlineScripts'
import { pluginManifest } from './plugin-manifest'
import { pluginWebAccessibleResources } from './plugin-webAccessibleResources'
import type { CrxOptions, CrxPlugin } from './types'
import { contentScripts } from './contentScripts'

export const crx = (
  options: {
    manifest: ManifestV3Export
  } & CrxOptions,
): PluginOption[] => {
  contentScripts.clear()
  return [
    pluginOptionsProvider(options),
    pluginBackground(),
    pluginContentScripts(),
    pluginDeclaredContentScripts(),
    pluginDynamicContentScripts(),
    pluginFileWriter(),
    pluginFileWriterPublic(),
    pluginFileWriterPolyfill(),
    pluginHtmlInlineScripts(),
    pluginWebAccessibleResources(),
    pluginContentScriptsCss(),
    pluginHMR(),
    pluginManifest(),
  ].flat()
}

export const chromeExtension = crx

export { defineDynamicResource, defineManifest } from './defineManifest'
export { allFilesReady, fileReady as filesReady } from './fileWriter'
export type { CrxPlugin, ManifestV3Export }
