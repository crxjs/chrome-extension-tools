import { parse } from 'node-html-parser'

export interface ExtractScriptsResult {
  /** Src attributes from all script tags (undefined for inline scripts) */
  scriptSrcs: (string | undefined)[]
  /** HTML with all script tags removed */
  html: string
}

/** Extracts script src attributes and removes all script tags from HTML. */
export function extractScriptsAndRemove(html: string): ExtractScriptsResult {
  const root = parse(html)
  const scripts = root.querySelectorAll('script')
  const scriptSrcs = scripts.map((el) => el.getAttribute('src'))
  scripts.forEach((el) => el.remove())
  return { scriptSrcs, html: root.toString() }
}

/** Firefox extension pages cannot proxy requests through a service worker. */
export function rewriteDevHtmlAssets(html: string, pageUrl: string): string {
  const root = parse(html)
  for (const selector of [
    'script[src]',
    'img[src]',
    'source[src]',
    'video[src]',
    'audio[src]',
    'input[src]',
    'link[href]',
  ]) {
    for (const element of root.querySelectorAll(selector)) {
      const attribute = selector === 'link[href]' ? 'href' : 'src'
      const value = element.getAttribute(attribute)!
      element.setAttribute(attribute, new URL(value, pageUrl).href)
    }
  }
  return root.toString()
}
