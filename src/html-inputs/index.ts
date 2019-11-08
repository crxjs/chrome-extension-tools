import 'array-flat-polyfill'
import { readFile } from 'fs-extra'
import { PluginHooks } from 'rollup'
import { not } from '../helpers'
import {
  getCssHrefs,
  getImgSrcs,
  getScriptSrc,
  loadHtml,
} from './cheerio'
import flatten from 'lodash.flatten'
import { relative } from 'path'
import { reduceToRecord } from '../manifest-input/reduceToRecord'

const isHtml = (path: string) => /\.html?$/.test(path)

const name = 'html-inputs'

/* ============================================ */
/*                  HTML-INPUTS                 */
/* ============================================ */

export default function htmlInputs(_options: {
  readonly srcDir: string
}): Partial<PluginHooks> & {
  name: string
} {
  /* -------------- hooks closures -------------- */

  const cache: {
    input: string[]
    html: string[]
    js: string[]
    img: string[]
    css: string[]
  } = {
    html: [],
    js: [],
    css: [],
    img: [],
    input: [],
  }

  /* --------------- plugin object -------------- */
  return {
    name,

    /* ============================================ */
    /*                 OPTIONS HOOK                 */
    /* ============================================ */

    options(options) {
      // Skip if cache.input exists
      if (cache.input.length === 0) {
        // Cast options.input to array
        let input: string[]
        if (typeof options.input === 'string') {
          input = [options.input]
        } else if (Array.isArray(options.input)) {
          input = [...options.input]
        } else if (typeof options.input === 'object') {
          input = Object.values(options.input)
        } else {
          throw new TypeError('options.input is undefined')
        }

        // Filter htm and html files
        cache.html = input.filter(isHtml)

        if (cache.html.length === 0) {
          return options
        }

        /* -------------- Load html files ------------- */

        const html$ = cache.html.map(loadHtml)

        cache.js = flatten(html$.map(getScriptSrc))
        cache.css = flatten(html$.map(getCssHrefs))
        cache.img = flatten(html$.map(getImgSrcs))

        // Cache jsEntries with existing options.input
        cache.input = input.filter(not(isHtml)).concat(cache.js)
      }

      return {
        ...options,
        input: cache.input.reduce(reduceToRecord(_options.srcDir), {}),
      }
    },

    /* ============================================ */
    /*              HANDLE FILE CHANGES             */
    /* ============================================ */

    async buildStart() {
      const assets = [...cache.css, ...cache.img, ...cache.html]

      assets.forEach((asset) => {
        this.addWatchFile(asset)
      })

      const loading = assets.map(async (asset) => {
        const source = await readFile(asset, 'utf8')

        let replaced: string | undefined
        if (asset.endsWith('html')) {
          replaced = source.replace(/\.[jt]sx?"/g, '.js"')
        }

        this.emitFile({
          type: 'asset',
          source: replaced || source,
          fileName: relative(_options.srcDir, asset),
        })
      })

      await Promise.all(loading)
    },

    watchChange(id) {
      if (id.endsWith('.html')) {
        cache.input = []
      }
    },
  }
}
