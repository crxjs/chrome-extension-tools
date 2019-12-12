import 'array-flat-polyfill'
import { readFile } from 'fs-extra'
import flatten from 'lodash.flatten'
import { relative } from 'path'
import { Plugin } from 'rollup'
import { not } from '../helpers'
import { reduceToRecord } from '../manifest-input/reduceToRecord'
import {
  getCssHrefs,
  getImgSrcs,
  getJsAssets,
  getScriptSrc,
  loadHtml,
} from './cheerio'

export interface HtmlInputsPluginCache {
  /** Scripts that should not be bundled */
  scripts: string[]
  /** Scripts that should be bundled */
  js: string[]
  /** Absolute paths for HTML files to emit */
  html: string[]
  /** Image files to emit */
  img: string[]
  /** Stylesheets to emit */
  css: string[]
  /** Cache of last options.input, will have other scripts */
  input: string[]
}

export type HtmlInputsPlugin = Pick<
  Required<Plugin>,
  'name' | 'options' | 'buildStart' | 'watchChange'
>

const isHtml = (path: string) => /\.html?$/.test(path)

const name = 'html-inputs'

/* ============================================ */
/*                  HTML-INPUTS                 */
/* ============================================ */

export default function htmlInputs(
  _options: {
    /** This is a getter, so cannot destructure */
    readonly srcDir: string | null
  },
  /** Used for testing */
  cache = {
    scripts: [],
    html: [],
    js: [],
    css: [],
    img: [],
    input: [],
  } as HtmlInputsPluginCache,
): HtmlInputsPlugin {
  return {
    name,

    /* ============================================ */
    /*                 OPTIONS HOOK                 */
    /* ============================================ */

    options(options) {
      // Skip if cache.input exists
      // cache is dumped in watchChange hook
      // FIXME: skip HTML parsing if dependencies have not changed
      // if (cache.input.length) return options

      // Parse options.input to array
      let input: string[]
      if (typeof options.input === 'string') {
        input = [options.input]
      } else if (Array.isArray(options.input)) {
        input = [...options.input]
      } else if (typeof options.input === 'object') {
        input = Object.values(options.input)
      } else {
        throw new TypeError(
          `options.input cannot be ${typeof options.input}`,
        )
      }

      // Filter htm and html files
      cache.html = input.filter(isHtml)

      // If no html files, do nothing
      if (cache.html.length === 0) return options

      /* ------------------------------------------------- */
      /*                 HANDLE HTML FILES                 */
      /* ------------------------------------------------- */

      const html$ = cache.html.map(loadHtml)

      cache.js = flatten(html$.map(getScriptSrc))
      cache.css = flatten(html$.map(getCssHrefs))
      cache.img = flatten(html$.map(getImgSrcs))
      cache.scripts = flatten(html$.map(getJsAssets))

      // Cache jsEntries with existing options.input
      cache.input = input.filter(not(isHtml)).concat(cache.js)

      if (cache.input.length === 0) {
        throw new Error(
          'At least one HTML file must have at least one script.',
        )
      }

      // TODO: simply remove HTML files from options.input
      // - Parse HTML and emit chunks and assets in buildStart
      return {
        ...options,
        input: cache.input.reduce(
          reduceToRecord(_options.srcDir),
          {},
        ),
      }
    },

    /* ============================================ */
    /*              HANDLE FILE CHANGES             */
    /* ============================================ */

    async buildStart() {
      const assets = [
        ...cache.css,
        ...cache.img,
        ...cache.html,
        ...cache.scripts,
      ]

      assets.forEach((asset) => {
        this.addWatchFile(asset)
      })

      const loading = assets.map(async (asset) => {
        let source: string | Buffer
        let replaced: string | undefined
        if (asset.endsWith('html')) {
          source = await readFile(asset, 'utf8')
          replaced = source.replace(/\.[jt]sx?"/g, '.js"')
        } else {
          source = await readFile(asset)
        }

        const fileName = relative(
          _options.srcDir as string,
          asset,
        )

        this.emitFile({
          type: 'asset',
          source: replaced || source,
          fileName,
        })
      })

      await Promise.all(loading)
    },

    watchChange(id) {
      if (id.endsWith('.html')) {
        // Dump cache if html file changes
        cache.input = []
      }
    },
  }
}
