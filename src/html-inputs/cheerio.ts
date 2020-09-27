import cheerio from 'cheerio'
import fs from 'fs-extra'
import path from 'path'
import { isString } from '../helpers'

export const loadHtml = (filePath: string) => {
  const htmlCode = fs.readFileSync(filePath, 'utf8')
  const $ = cheerio.load(htmlCode)

  return Object.assign($, { filePath })
}

export const getRelativePath = (filePath: string) => (
  p: string,
) => {
  const fileDir = path.dirname(filePath)
  const relDir = path.relative(process.cwd(), fileDir)

  return path.join(relDir, p)
}

/* -------------------- SCRIPTS -------------------- */

export const getScriptElems = ($: cheerio.Root) =>
  $('script')
    .not('[data-rollup-asset]')
    .not('[src^="http:"]')
    .not('[src^="https:"]')
    .not('[src^="data:"]')
    .not('[src^="/"]')

// Mutative action
export const mutateScriptElems = (
  $: cheerio.Root & {
    filePath: string
  },
) => {
  getScriptElems($)
    .attr('type', 'module')
    .attr('src', (i, value) => {
      // FIXME: @types/cheerio is wrong for AttrFunction: index.d.ts, line 16
      // declare type AttrFunction = (i: number, currentValue: string) => any;
      // eslint-disable-next-line
      // @ts-ignore
      const replaced = value.replace(/\.[jt]sx?/g, '.js')

      return replaced
    })

  return $
}

export const getScripts = ($: cheerio.Root) =>
  getScriptElems($).toArray()

export const getScriptSrc = (
  $: cheerio.Root & {
    filePath: string
  },
) =>
  getScripts($)
    .map((elem) => $(elem).attr('src'))
    .filter(isString)
    .map(getRelativePath($.filePath))

/* ----------------- ASSET SCRIPTS ----------------- */

const getAssets = ($: cheerio.Root) =>
  $('script')
    .filter('[data-rollup-asset="true"]')
    .not('[src^="http:"]')
    .not('[src^="https:"]')
    .not('[src^="data:"]')
    .not('[src^="/"]')
    .toArray()

export const getJsAssets = (
  $: cheerio.Root & {
    filePath: string
  },
) =>
  getAssets($)
    .map((elem) => $(elem).attr('src'))
    .filter(isString)
    .map(getRelativePath($.filePath))

/* -------------------- css ------------------- */

const getCss = ($: cheerio.Root) =>
  $('link')
    .filter('[rel="stylesheet"]')
    .not('[href^="http:"]')
    .not('[href^="https:"]')
    .not('[href^="data:"]')
    .not('[href^="/"]')
    .toArray()

export const getCssHrefs = (
  $: cheerio.Root & {
    filePath: string
  },
) =>
  getCss($)
    .map((elem) => $(elem).attr('href'))
    .filter(isString)
    .map(getRelativePath($.filePath))

/* -------------------- img ------------------- */

const getImgs = ($: cheerio.Root) =>
  $('img')
    .not('[src^="http://"]')
    .not('[src^="https://"]')
    .not('[src^="data:"]')
    .not('[src^="/"]')
    .toArray()

const getFavicons = ($: cheerio.Root) =>
  $('link[rel="icon"]')
    .not('[href^="http:"]')
    .not('[href^="https:"]')
    .not('[href^="data:"]')
    .not('[href^="/"]')
    .toArray()

export const getImgSrcs = (
  $: cheerio.Root & {
    filePath: string
  },
) => {
  return [
    ...getImgs($).map((elem) => $(elem).attr('src')),
    ...getFavicons($).map((elem) => $(elem).attr('href')),
  ]
    .filter(isString)
    .map(getRelativePath($.filePath))
}
