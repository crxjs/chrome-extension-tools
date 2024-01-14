import type { Node as AcornNode } from 'acorn'
import type { Options as FastGlobOptions } from 'fast-glob'
import type { OutputBundle, PluginContext } from 'rollup'
import type { HMRPayload, Plugin as VitePlugin } from 'vite'
import { ManifestV3 } from './manifest'

export interface AcornLiteral extends AcornNode {
  type: 'Literal'
  raw: string
  value: string
}

export interface AcornCallExpression extends AcornNode {
  type: 'CallExpression'
  arguments: AcornNode[]
  callee: AcornNode
  optional: boolean
}

export interface AcornMemberExpression extends AcornNode {
  type: 'MemberExpression'
  computed: boolean
  object: AcornNode
  optional: boolean
  property: AcornNode
}

export interface AcornIdentifier extends AcornNode {
  type: 'Identifier'
  name: string
}

export interface AcornTemplateElement extends AcornNode {
  type: 'TemplateElement'
  tail: boolean
  value: {
    cooked: string
    raw: string
  }
}

export type CrxDevAssetId = {
  id: string
  type: 'asset'
  source?: string | Uint8Array
}

export type CrxDevScriptId = {
  id: string
  type: 'module' | 'iife'
}

export interface CrxPlugin extends VitePlugin {
  /**
   * Runs during the transform hook for the manifest. Filenames use input
   * filenames.
   */
  transformCrxManifest?: (
    this: PluginContext,
    manifest: ManifestV3,
  ) => Promise<ManifestV3 | null | undefined> | ManifestV3 | null | undefined
  /**
   * Runs during generateBundle, before manifest output. Filenames use output
   * filenames.
   */
  renderCrxManifest?: (
    this: PluginContext,
    manifest: ManifestV3,
    bundle: OutputBundle,
  ) => Promise<ManifestV3 | null | undefined> | ManifestV3 | null | undefined
  /**
   * Runs in the file writer on content scripts during development. `script.id`
   * is Vite URL format.
   */
  renderCrxDevScript?: (
    code: string,
    script: CrxDevScriptId,
  ) => Promise<string | null | undefined> | string | null | undefined
}

// change this to an interface when you want to add options
export interface CrxOptions {
  contentScripts?: {
    preambleCode?: string | false
    hmrTimeout?: number
    injectCss?: boolean
  }
  fastGlobOptions?: FastGlobOptions
  /**
   * The browser that this extension is targeting, can be "firefox" or "chrome".
   * Default is "chrome".
   */
  browser?: Browser
}

export type Browser = 'firefox' | 'chrome'

export interface CrxPluginFn {
  (options?: CrxOptions): CrxPlugin | CrxPlugin[]
}

export type ManifestFiles = {
  contentScripts: string[]
  contentStyles: string[]
  html: string[]
  icons: string[]
  locales: string[]
  rulesets: string[]
  background: string[]
  webAccessibleResources: string[]
}

export type WebAccessibleFiles = {
  webScripts: string[]
  webResources: string[]
}

export type CrxHMRPayload =
  | {
      type: 'custom'
      event: 'crx:runtime-reload'
    }
  | {
      type: 'custom'
      event: 'crx:content-script-payload'
      data: HMRPayload
    }
