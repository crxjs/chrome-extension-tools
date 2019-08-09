interface RollupPluginChromeExtension {
  name: string
  options(inputOptions: any): void
  buildStart(inputOptions: any): void
  watchChange(id: string): void
  generateBundle(outputOptions: any): Promise<void>
  writeBundle(outputOptions: any): Promise<void>
}

export function chromeExtension(options?: {
  assets?: {
    include?: string[]
    exclude?: string[]
  }
  dynamicImportWrapper?:
    | {
        wakeEvents?: string[]
        eventDelay?: number | false
      }
    | false
  entries?: {
    include?: string[]
    exclude?: string[]
  }
  verbose?: boolean
  pkg?: {
    description?: string
    name?: string
    version?: string
    [prop: string]: any
  }
  publicKey?: string
  reloader?: 'non-persistent' | 'persistent' | false
}): RollupPluginChromeExtension
