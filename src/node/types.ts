import type { Node } from 'acorn'
import type { PluginContext, OutputBundle } from 'rollup'
import type { HMRPayload, Plugin as VitePlugin, ViteDevServer } from 'vite'
import { ManifestV3 } from './manifest'

export interface AcornLiteral extends Node {
  type: 'Literal'
  raw: string
  value: string
}

export interface CrxPlugin extends VitePlugin {
  /** Runs during dev mode when the file writer has started and server is listening. */
  fileWriterStart?: (server: ViteDevServer) => Promise<void> | void
  /** Runs during the transform hook for the manifest. */
  transformCrxManifest?: (
    this: PluginContext,
    manifest: ManifestV3,
  ) => Promise<ManifestV3 | null | undefined> | ManifestV3 | null | undefined
  /** Runs during generateBundle, before manifest output. */
  renderCrxManifest?: (
    this: PluginContext,
    manifest: ManifestV3,
    bundle: OutputBundle,
  ) => Promise<ManifestV3 | null | undefined> | ManifestV3 | null | undefined
}

// change this to an interface when you want to add options
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface CrxOptions {
  contentScripts?: {
    preambleCode?: string | false
    hmrTimeout?: number
    injectCss?: boolean
  }
}

export interface CrxPluginFn {
  (options: CrxOptions): CrxPlugin | CrxPlugin[]
}

export type ManifestFiles = {
  contentScripts: string[]
  contentStyles: string[]
  html: string[]
  icons: string[]
  locales: string[]
  rulesets: string[]
  background: string[]
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
