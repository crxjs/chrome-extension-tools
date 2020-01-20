import 'array-flat-polyfill'
import { readFile } from 'fs-extra'
import flatten from 'lodash.flatten'
import { relative } from 'path'
import prettier from 'prettier'
import { Plugin } from 'rollup'
import { not } from '../helpers'
import { reduceToRecord } from '../manifest-input/reduceToRecord'
import {
  getCssHrefs,
  getImgSrcs,
  getJsAssets,
  getScriptSrc,
  loadHtml,
  mutateScriptElems,
} from './cheerio'

/** CheerioStatic objects with a file path */
type CheerioFile = CheerioStatic & {
  filePath: string
}

export interface HtmlInputsPluginCache {
  /** Scripts that should not be bundled */
  scripts: string[]
  /** Scripts that should be bundled */
  js: string[]
  /** Absolute paths for HTML files to emit */
  html: string[]
  /** Html files as Cheerio objects */
  html$: CheerioFile[]
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
    html$: [],
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

      /* ------------------------------------------------- */
      /*                 HANDLE HTML FILES                 */
      /* ------------------------------------------------- */

      // Filter htm and html files
      cache.html = input.filter(isHtml)

      // If no html files, do nothing
      if (cache.html.length === 0) return options

      // If the cache has been dumped, reload from files
      if (cache.html$.length === 0) {
        // This is all done once
        cache.html$ = cache.html.map(loadHtml)
        // FIXME: not the place to do this

        cache.js = flatten(cache.html$.map(getScriptSrc))
        cache.css = flatten(cache.html$.map(getCssHrefs))
        cache.img = flatten(cache.html$.map(getImgSrcs))
        cache.scripts = flatten(cache.html$.map(getJsAssets))

        // Cache jsEntries with existing options.input
        cache.input = input.filter(not(isHtml)).concat(cache.js)

        // Prepare cache.html$ for asset emission
        cache.html$.forEach(mutateScriptElems)

        if (cache.input.length === 0) {
          throw new Error(
            'At least one HTML file must have at least one script.',
          )
        }
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
        ...cache.scripts,
      ]

      assets.concat(cache.html).forEach((asset) => {
        this.addWatchFile(asset)
      })

      const emitting = assets.map(async (asset) => {
        // Read these files as Buffers
        const source = await readFile(asset)

        const fileName = relative(
          _options.srcDir as string,
          asset,
        )

        this.emitFile({
          type: 'asset',
          source, // Buffer
          fileName,
        })
      })

      cache.html$.map(($) => {
        const source = prettier.format($.html(), {
          parser: 'html',
          htmlWhitespaceSensitivity: 'strict',
        })

        const fileName = relative(
          _options.srcDir as string,
          $.filePath,
        )

        this.emitFile({
          type: 'asset',
          source, // String
          fileName,
        })
      })

      await Promise.all(emitting)
    },

    watchChange(id) {
      if (id.endsWith('.html') || id.endsWith('manifest.json')) {
        // Dump cache if html file or manifest changes
        cache.html$ = []
      }
    },
  }
}
