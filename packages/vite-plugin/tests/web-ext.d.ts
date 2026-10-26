import type { WebExtBrowser } from 'vitest-environment-web-ext'

declare global {
  var browser: WebExtBrowser
}
