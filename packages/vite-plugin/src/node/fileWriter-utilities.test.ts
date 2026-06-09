import { describe, expect, test } from 'vitest'
import { getFileName } from './fileWriter-utilities'

// Characters that are illegal in Windows filenames
const WINDOWS_ILLEGAL_CHARS = /[<>:"|?*]/

describe('getFileName', () => {
  test('strips leading slash from id', () => {
    expect(getFileName({ type: 'module', id: '/src/main.ts' })).toBe(
      'src/main.ts.js',
    )
  })

  test('converts url query characters', () => {
    const result = getFileName({
      type: 'module',
      id: '/src/App.vue?vue&type=script&setup=true&lang.ts',
    })
    expect(result).not.toContain('?')
    expect(result).not.toContain('&')
    expect(result).not.toContain('=')
  })

  test('strips timestamps', () => {
    expect(getFileName({ type: 'module', id: '/src/main.ts?t=12345' })).toBe(
      'src/main.ts.js',
    )
  })

  test('moves node_modules to vendor/', () => {
    const result = getFileName({
      type: 'module',
      id: '/node_modules/vue/dist/vue.runtime.esm-bundler.js',
    })
    expect(result).toMatch(/^vendor\//)
    expect(result).not.toContain('node_modules')
  })

  test('moves @-scoped packages to vendor/', () => {
    const result = getFileName({
      type: 'module',
      id: '/@id/__x00__plugin-vue:export-helper',
    })
    expect(result).toMatch(/^vendor\//)
  })

  test('sanitizes colons for Windows compatibility', () => {
    const result = getFileName({
      type: 'module',
      id: '/@id/__x00__plugin-vue:export-helper',
    })
    expect(result).not.toMatch(WINDOWS_ILLEGAL_CHARS)
    expect(result).toBe('vendor/id-__x00__plugin-vue-export-helper.js')
  })

  test('produces Windows-safe filenames for all types', () => {
    const ids = [
      '/@id/__x00__plugin-vue:export-helper',
      '/src/App.vue?vue&type=style&index=0&scoped=abc&lang.css',
      '/node_modules/.vite/deps/vue.js?v=e5500e05',
    ]
    for (const id of ids) {
      for (const type of ['module', 'iife', 'loader', 'asset'] as const) {
        const result = getFileName({ type, id })
        expect(result).not.toMatch(WINDOWS_ILLEGAL_CHARS)
      }
    }
  })

  test('appends correct extension per type', () => {
    const id = '/src/main.ts'
    expect(getFileName({ type: 'module', id })).toBe('src/main.ts.js')
    expect(getFileName({ type: 'iife', id })).toBe('src/main.ts.iife.js')
    expect(getFileName({ type: 'loader', id })).toBe('src/main.ts-loader.js')
    expect(getFileName({ type: 'asset', id })).toBe('src/main.ts')
  })

  test('sanitizes leading underscores from basename', () => {
    const result = getFileName({ type: 'asset', id: '/__uno.css' })
    expect(result).toBe('uno.css')
  })
})
