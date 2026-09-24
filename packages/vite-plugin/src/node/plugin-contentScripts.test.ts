import { parse } from 'acorn'
import type { OutputChunk, PluginContext } from 'rollup'
import { afterEach, describe, expect, test } from 'vitest'
import { contentScripts } from './contentScripts'
import { finalizeBuildContentScripts } from './plugin-contentScripts'

const fileName = 'assets/content.js'
const context: Pick<PluginContext, 'emitFile' | 'getFileName'> = {
  emitFile: () => 'unused',
  getFileName: () => fileName,
}

function finalizeContentScript(code: string) {
  const chunk = {
    type: 'chunk',
    code,
    imports: [],
    dynamicImports: [],
    exports: [],
  } as unknown as OutputChunk

  contentScripts.set('content-ref', {
    type: 'loader',
    id: '/src/content.ts',
    refId: 'content-ref',
    matches: [],
  })
  finalizeBuildContentScripts(context, { [fileName]: chunk })

  return chunk.code
}

afterEach(() => {
  contentScripts.clear()
})

describe('finalizeBuildContentScripts', () => {
  test.each([
    {
      name: 'separate sourcemap without a final newline',
      code: 'console.log("content script")\n//# sourceMappingURL=content.js.map',
      expected:
        '(function(){console.log("content script")})()\n//# sourceMappingURL=content.js.map',
    },
    {
      name: 'inline sourcemap with a final newline',
      code: 'console.log("content script")\n//# sourceMappingURL=data:application/json;base64,e30=\n',
      expected:
        '(function(){console.log("content script")})()\n//# sourceMappingURL=data:application/json;base64,e30=\n',
    },
    {
      name: 'legacy source map marker with CRLF line endings',
      code: 'console.log("content script")\r\n//@ sourceMappingURL=content.js.map\r\n',
      expected:
        '(function(){console.log("content script")})()\r\n//@ sourceMappingURL=content.js.map\r\n',
    },
  ])('closes the IIFE before a trailing $name', ({ code, expected }) => {
    const result = finalizeContentScript(code)

    expect(result).toBe(expected)
    expect(() => parse(result, { ecmaVersion: 'latest' })).not.toThrow()
  })

  test('preserves the existing wrapper for code without a sourcemap', () => {
    expect(finalizeContentScript('console.log("content script")')).toBe(
      '(function(){console.log("content script")})()\n',
    )
  })
})
