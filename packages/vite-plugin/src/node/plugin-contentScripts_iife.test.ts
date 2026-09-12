import { describe, expect, test } from 'vitest'
import { isIifeContentScript } from './plugin-contentScripts_iife'

describe('isIifeContentScript', () => {
  test('returns true for .iife.ts files', () => {
    expect(isIifeContentScript('content.iife.ts')).toBe(true)
    expect(isIifeContentScript('src/content/main.iife.ts')).toBe(true)
    expect(isIifeContentScript('/absolute/path/script.iife.ts')).toBe(true)
  })

  test('returns true for .iife.tsx files', () => {
    expect(isIifeContentScript('content.iife.tsx')).toBe(true)
    expect(isIifeContentScript('src/content/main.iife.tsx')).toBe(true)
  })

  test('returns true for .iife.js files', () => {
    expect(isIifeContentScript('content.iife.js')).toBe(true)
    expect(isIifeContentScript('src/content/main.iife.js')).toBe(true)
  })

  test('returns true for .iife.jsx files', () => {
    expect(isIifeContentScript('content.iife.jsx')).toBe(true)
  })

  test('returns true for .iife.mjs files', () => {
    expect(isIifeContentScript('content.iife.mjs')).toBe(true)
  })

  test('returns true for .iife.cjs files', () => {
    expect(isIifeContentScript('content.iife.cjs')).toBe(true)
  })

  test('returns false for regular .ts files', () => {
    expect(isIifeContentScript('content.ts')).toBe(false)
    expect(isIifeContentScript('src/content/main.ts')).toBe(false)
  })

  test('returns false for regular .js files', () => {
    expect(isIifeContentScript('content.js')).toBe(false)
    expect(isIifeContentScript('src/content/main.js')).toBe(false)
  })

  test('returns false for files with iife in the name but not as extension', () => {
    expect(isIifeContentScript('iife-content.ts')).toBe(false)
    expect(isIifeContentScript('content-iife.ts')).toBe(false)
    expect(isIifeContentScript('iife.ts')).toBe(false)
  })

  test('returns false for files with .iife in directory name', () => {
    expect(isIifeContentScript('src/iife.content/main.ts')).toBe(false)
  })
})
