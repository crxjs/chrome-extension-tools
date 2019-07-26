import path from 'path'
import fs from 'fs-extra'
import cheerio from 'cheerio'

export const loadHtml = (filePath) => {
  const htmlCode = fs.readFileSync(filePath, 'utf8')
  const $ = cheerio.load(htmlCode)

  return $
}

const getRelativePath = (htmlPath) => (p) =>
  path.join(path.dirname(htmlPath), p)

const getEntries = ($) =>
  $('script')
    .not('[data-rollup-asset]')
    .not('[src^="http:"]')
    .not('[src^="https:"]')
    .not('[src^="data:"]')
    .not('[src^="/"]')
    .toArray()

export const getJsEntries = ([htmlPath, $]) =>
  getEntries($)
    .map((elem) => $(elem).attr('src'))
    .map(getRelativePath(htmlPath))

export const mutateJsEntries = ($) => {
  getEntries($)
    .map((elem) => $(elem))
    .forEach((e) => {
      e.attr('type', 'module')
      // TODO: support ts files here
      // TODO: add test for ts in html
      const src = e.attr('src')

      if (src.endsWith('.ts')) {
        e.attr('src', src.replace(/\.ts/, '.js'))
      }
    })

  return $
}

/* ----------------- js assets ---------------- */

const getAssets = ($) =>
  $('script')
    .filter('[data-rollup-asset="true"]')
    .not('[src^="http:"]')
    .not('[src^="https:"]')
    .not('[src^="data:"]')
    .not('[src^="/"]')
    .toArray()

export const getJsAssets = ([htmlPath, $]) =>
  getAssets($)
    .map((elem) => $(elem).attr('src'))
    .map(getRelativePath(htmlPath))

export const mutateJsAssets = ($, fn) => {
  getAssets($)
    .map((elem) => $(elem))
    .forEach((e) => {
      const value = fn(e.attr('src'))
      e.attr('src', value)
    })

  return $
}

/* -------------------- css ------------------- */

const getCss = ($) =>
  $('link')
    .filter('[rel="stylesheet"]')
    .not('[href^="http:"]')
    .not('[href^="https:"]')
    .not('[href^="data:"]')
    .not('[href^="/"]')
    .toArray()

export const getCssHrefs = ([htmlPath, $]) =>
  getCss($)
    .map((elem) => $(elem).attr('href'))
    .map(getRelativePath(htmlPath))

export const mutateCssHrefs = ($, fn) => {
  getCss($)
    .map((elem) => $(elem))
    .forEach((e) => {
      const value = fn(e.attr('href'))
      e.attr('href', value)
    })

  return $
}

/* -------------------- img ------------------- */
const getImgs = ($) =>
  $('img')
    .not('[src^="http://"]')
    .not('[src^="https://"]')
    .not('[src^="data:"]')
    .not('[src^="/"]')
    .toArray()

const getFavicons = ($) =>
  $('link[rel="icon"]')
    .not('[href^="http:"]')
    .not('[href^="https:"]')
    .not('[href^="data:"]')
    .not('[href^="/"]')
    .toArray()

export const getImgSrcs = ([htmlPath, $]) => {
  return [
    ...getImgs($).map((elem) => $(elem).attr('src')),
    // get favicons
    ...getFavicons($).map((elem) => $(elem).attr('href')),
  ].map(getRelativePath(htmlPath))
}

export const mutateImgSrcs = ($, fn) => {
  getImgs($)
    .map((elem) => $(elem))
    .forEach((e) => {
      const value = fn(e.attr('src'))
      e.attr('src', value)
    })

  getFavicons($)
    .map((elem) => $(elem))
    .forEach((e) => {
      const value = fn(e.attr('href'))
      e.attr('href', value)
    })

  return $
}
