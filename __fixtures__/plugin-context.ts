import { PluginContext } from 'rollup'

/** Mocked Rollup Plugin Context */
export const context: PluginContext = {
  addWatchFile: jest.fn(),
  // @ts-ignore
  cache: null,
  /** @deprecated Use `this.emitFile` instead */
  // @ts-ignore
  emitAsset: null,
  /** @deprecated Use `this.emitFile` instead */
  // @ts-ignore
  emitChunk: null,
  emitFile: jest.fn(),
  // @ts-ignore
  error: jest.fn(),
  /** @deprecated Use `this.getFileName` instead */
  // @ts-ignore
  getAssetFileName: null,
  /** @deprecated Use `this.getFileName` instead */
  // @ts-ignore
  getChunkFileName: null,
  getFileName: jest.fn(),
  getModuleInfo: jest.fn(),
  /** @deprecated Use `this.resolve` instead */
  // @ts-ignore
  isExternal: null,
  // @ts-ignore
  moduleIds: null,
  parse: jest.fn(),
  resolve: jest.fn(),
  /** @deprecated Use `this.resolve` instead */
  // @ts-ignore
  resolveId: null,
  setAssetSource: jest.fn(),
  warn: jest.fn(),
  /** @deprecated Use `this.addWatchFile` and the `watchChange` hook instead  */
  // @ts-ignore
  watcher: null,
}
