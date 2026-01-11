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
