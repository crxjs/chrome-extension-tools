// @vitest-environment jsdom
import { beforeEach, describe, expect, test } from 'vitest'
import { shadowDomStyleInjectionPolyfill } from './plugin-fileWriter-polyfill'

/**
 * These tests document the runtime contract of the polyfill that is appended
 * to `@vite/client` when a content script opts into `shadowDom: true`.
 *
 * The polyfill is a self-invoking IIFE injected as a string; we execute it
 * inside a jsdom environment and assert the three observable guarantees:
 *
 *   1. Fresh `<style data-vite-dev-id>` inserts land in the shadow root
 *      (not the document head), and stale entries with the same dev id
 *      are evicted first (prevents cascade lingering after HMR).
 *   2. `document.querySelector('style[data-vite-dev-id=...]')` sees the
 *      shadow-root copy — Vite's client uses this to dedupe updates.
 *   3. Writing `style.textContent = newCss` on a shadow-attached dev style
 *      replaces the element with a fresh clone, bypassing Vite's
 *      `sheetsMap` textContent-reuse no-op race (PR #1144, @nizoio).
 */
describe('shadowDomStyleInjectionPolyfill', () => {
  let host: HTMLElement
  let shadow: ShadowRoot

  beforeEach(() => {
    // Reset document + globals between tests; jsdom persists them otherwise.
    document.head.innerHTML = ''
    document.body.innerHTML = ''
    delete (globalThis as any).__CRX_SHADOW_ROOT__

    host = document.createElement('div')
    document.body.appendChild(host)
    shadow = host.attachShadow({ mode: 'open' })
    ;(globalThis as any).__CRX_SHADOW_ROOT__ = shadow

    // Execute the polyfill against the current jsdom globals.
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    new Function(shadowDomStyleInjectionPolyfill)()
  })

  test('redirects dev-style appendChild from <head> into the shadow root', () => {
    const style = document.createElement('style')
    style.setAttribute('data-vite-dev-id', '/src/App.vue?vue&type=style')
    style.textContent = '.x { color: red }'

    document.head.appendChild(style)

    expect(style.getRootNode()).toBe(shadow)
    expect(document.head.contains(style)).toBe(false)
  })

  test('leaves non-dev <style> elements in <head> alone', () => {
    const style = document.createElement('style')
    style.textContent = '.y { color: green }'

    document.head.appendChild(style)

    expect(document.head.contains(style)).toBe(true)
    expect(shadow.contains(style)).toBe(false)
  })

  test('evicts a prior style with the same dev id on fresh insert', () => {
    const mk = (css: string) => {
      const s = document.createElement('style')
      s.setAttribute('data-vite-dev-id', '/src/App.vue?vue&type=style')
      s.textContent = css
      return s
    }

    const first = mk('.x { color: red }')
    document.head.appendChild(first)
    const second = mk('.x { color: green }')
    document.head.appendChild(second)

    const matches = shadow.querySelectorAll('style[data-vite-dev-id]')
    expect(matches).toHaveLength(1)
    expect(matches[0]).toBe(second)
  })

  test('document.querySelector finds dev styles living in the shadow root', () => {
    const style = document.createElement('style')
    style.setAttribute('data-vite-dev-id', '/src/App.vue?vue&type=style')
    document.head.appendChild(style)

    const found = document.querySelector(
      'style[data-vite-dev-id="/src/App.vue?vue&type=style"]',
    )
    expect(found).toBe(style)
  })

  test('textContent setter on shadow-attached dev style updates the live shadow node in place', () => {
    const original = document.createElement('style')
    original.setAttribute('data-vite-dev-id', '/src/App.vue?vue&type=style')
    original.textContent = '.x { color: red }'
    document.head.appendChild(original) // → redirected to shadow

    expect(original.parentNode).toBe(shadow)

    // Vite's updateStyle() path: reuse the cached element and overwrite
    // its textContent. The polyfill must guarantee the shadow-root copy
    // reflects the new value, even on a same-value write, so Vite's
    // sheetsMap caching can't silently no-op an HMR update.
    original.textContent = '.x { color: blue }'

    const styles = shadow.querySelectorAll('style[data-vite-dev-id]')
    expect(styles).toHaveLength(1)
    expect(styles[0].textContent).toBe('.x { color: blue }')
  })

  test('textContent setter redirects writes to the live shadow node when caller is detached', () => {
    // Simulates the Vite sheetsMap-holds-stale-ref case: a detached
    // element still carries the dev id, but the live node lives in
    // the shadow root. Writing to the detached ref must still update
    // the live shadow node.
    const id = '/src/App.vue?vue&type=style'
    const live = document.createElement('style')
    live.setAttribute('data-vite-dev-id', id)
    live.textContent = '.x { color: green }'
    document.head.appendChild(live) // → redirected to shadow
    expect(live.parentNode).toBe(shadow)

    const detached = document.createElement('style')
    detached.setAttribute('data-vite-dev-id', id)
    // detached is NOT attached anywhere — mimics a stale cache ref.

    detached.textContent = '.x { color: blue }'

    // Live shadow node got the new value.
    expect(live.textContent).toBe('.x { color: blue }')
    // Detached ref mirrored too (so any later read through Vite's
    // cached ref sees the current value, not stale content).
    expect(detached.textContent).toBe('.x { color: blue }')
  })

  test('textContent setter on a plain <style> (not shadow, no dev id) is untouched', () => {
    const style = document.createElement('style')
    document.body.appendChild(style)

    style.textContent = '.z { color: purple }'

    expect(style.parentNode).toBe(document.body)
    expect(style.textContent).toBe('.z { color: purple }')
  })

  test('escapes double-quotes in the dev id selector when evicting duplicates', () => {
    // Guards the string-concat selector build against injection / breakage
    // when Vite's dev id contains a literal quote character.
    const id = '/src/Weird".vue?vue&type=style'
    const a = document.createElement('style')
    a.setAttribute('data-vite-dev-id', id)
    document.head.appendChild(a)
    const b = document.createElement('style')
    b.setAttribute('data-vite-dev-id', id)

    expect(() => document.head.appendChild(b)).not.toThrow()
    // Only the newest survives.
    expect(shadow.querySelectorAll('style[data-vite-dev-id]')).toHaveLength(1)
  })
})
