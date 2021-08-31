import { getViteServer, VITE_SERVER_URL } from '$src/viteAdaptor'
import cheerio, { CheerioAPI } from 'cheerio'
import fs from 'fs-extra'
import path from 'path'
import { isString } from '../helpers'
import { HtmlInputsOptions } from '../plugin-options'

export type HtmlFilePathData = {
  filePath: string
  rootPath: string
}

/** CheerioAPI objects with a file path */
export type CheerioFile = CheerioAPI & HtmlFilePathData

export const loadHtml =
  (rootPath: string) =>
  (filePath: string): CheerioFile => {
    const htmlCode = fs.readFileSync(filePath, 'utf8')
    const $ = cheerio.load(htmlCode)

    return Object.assign($, { filePath, rootPath })
  }

export const cloneHtml = (src$: CheerioFile): CheerioFile => {
  const html = src$.html()
  const $ = cheerio.load(html)
  return Object.assign($, {
    filePath: src$.filePath,
    rootPath: src$.rootPath,
  })
}

export const getRelativePath =
  ({ filePath, rootPath }: HtmlFilePathData) =>
  (p: string) => {
    const htmlFileDir = path.dirname(filePath)

    let relDir: string
    if (p.startsWith('/')) {
      relDir = path.relative(process.cwd(), rootPath)
    } else {
      relDir = path.relative(process.cwd(), htmlFileDir)
    }

    return path.join(relDir, p)
  }

/* -------------------- SCRIPTS -------------------- */

export const getScriptElems = ($: CheerioAPI) =>
  $('script')
    .not('[data-rollup-asset]')
    .not('[src^="http:"]')
    .not('[src^="https:"]')
    .not('[src^="data:"]')
    .not('[src^="/"]')

export const updateHtmlElements =
  ({
    browserPolyfill,
  }: Pick<HtmlInputsOptions, 'browserPolyfill'>) =>
  (src$: CheerioFile) => {
    const $ = cloneHtml(src$)

    getScriptElems($)
      .attr('type', 'module')
      .attr('src', (i, value) => {
        const final = getViteServer()
          ? `${VITE_SERVER_URL}/${value}`
          : value.replace(/\.[jt]sx?/g, '.js')

        return final
      })

    if (browserPolyfill) {
      const head = $('head')
      if (
        browserPolyfill === true ||
        (typeof browserPolyfill === 'object' &&
          browserPolyfill.executeScript)
      ) {
        head.prepend(
          '<script src="/assets/browser-polyfill-executeScript.js"></script>',
        )
      }

      head.prepend(
        '<script src="/assets/browser-polyfill.js"></script>',
      )
    }

    return $
  }

export const getScripts = ($: CheerioAPI) =>
  getScriptElems($).toArray()

export const getScriptSrc = ($: CheerioFile) =>
  getScripts($)
    .map((elem) => $(elem).attr('src'))
    .filter(isString)
    .map(getRelativePath($))

/* ----------------- ASSET SCRIPTS ----------------- */

const getAssets = ($: CheerioAPI) =>
  $('script')
    .filter('[data-rollup-asset="true"]')
    .not('[src^="http:"]')
    .not('[src^="https:"]')
    .not('[src^="data:"]')
    .not('[src^="/"]')
    .toArray()

export const getJsAssets = ($: CheerioFile) =>
  getAssets($)
    .map((elem) => $(elem).attr('src'))
    .filter(isString)
    .map(getRelativePath($))

/* -------------------- css ------------------- */

const getCss = ($: CheerioAPI) =>
  $('link')
    .filter('[rel="stylesheet"]')
    .not('[href^="http:"]')
    .not('[href^="https:"]')
    .not('[href^="data:"]')
    .not('[href^="/"]')
    .toArray()

export const getCssHrefs = ($: CheerioFile) =>
  getCss($)
    .map((elem) => $(elem).attr('href'))
    .filter(isString)
    .map(getRelativePath($))

/* -------------------- img ------------------- */

const getImgs = ($: CheerioAPI) =>
  $('img')
    .not('[src^="http://"]')
    .not('[src^="https://"]')
    .not('[src^="data:"]')
    .toArray()

const getFavicons = ($: CheerioAPI) =>
  $('link[rel="icon"]')
    .not('[href^="http:"]')
    .not('[href^="https:"]')
    .not('[href^="data:"]')
    .toArray()

export const getImgSrcs = ($: CheerioFile) => {
  return [
    ...getImgs($).map((elem) => $(elem).attr('src')),
    ...getFavicons($).map((elem) => $(elem).attr('href')),
  ]
    .filter(isString)
    .map(getRelativePath($))
}
