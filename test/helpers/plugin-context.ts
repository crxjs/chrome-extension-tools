/* eslint-disable @typescript-eslint/ban-ts-comment */
import {
  PluginContext,
  EmittedFile,
  RollupError,
  ResolvedId,
  RollupWarning,
} from 'rollup'

export type MockPluginContext = PluginContext & {
  addWatchFile: jest.MockInstance<void, [string]>
  emitFile: jest.MockInstance<string, [EmittedFile]>
  error: jest.MockInstance<
    never,
    [
      RollupError | string,
      (number | { column: number; line: number })?,
    ]
  >
  getFileName: jest.MockInstance<string, [string]>
  getModuleInfo: jest.MockInstance<
    {
      hasModuleSideEffects: boolean
      id: string
      importedIds: string[]
      isEntry: boolean
      isExternal: boolean
    },
    [string]
  >
  parse: jest.MockInstance<
    /** Returns ESTree.Program */
    any,
    [string, any]
  >
  resolve: jest.MockInstance<
    Promise<ResolvedId | null>,
    [string, string, { skipSelf: boolean }]
  >
  setAssetSource: jest.MockInstance<
    void,
    [string, string | Buffer]
  >
  warn: jest.MockInstance<
    void,
    [
      RollupWarning | string,
      number | { column: number; line: number },
    ]
  >
}

/** Mocked Rollup Plugin Context */
export const context: MockPluginContext = {
  addWatchFile: jest.fn(),
  // @ts-ignore
  cache: null,
  /** @deprecated Use `this.emitFile` instead */
  // @ts-ignore
  emitAsset: null,
  /** @deprecated Use `this.emitFile` instead */
  // @ts-ignore
  emitChunk: null,
  emitFile: jest.fn(({ name, fileName }) => (name || fileName)!),
  // @ts-ignore
  error: jest.fn((message: string) => {
    throw new Error(message)
  }),
  /** @deprecated Use `this.getFileName` instead */
  // @ts-ignore
  getAssetFileName: null,
  /** @deprecated Use `this.getFileName` instead */
  // @ts-ignore
  getChunkFileName: null,
  getFileName: jest.fn((id) => `sample/file-path-${id}.js`),
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
