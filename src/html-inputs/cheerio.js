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

export const getJsEntries = ([htmlPath, $]) =>
  $('script')
    .not('[data-rollup-asset]')
    .toArray()
    .map((elem) => $(elem).attr('src'))
    .map(getRelativePath(htmlPath))

export const mutateJsEntries = ($) => {
  $('script')
    .not('[data-rollup-asset]')
    .toArray()
    .map((elem) => $(elem))
    .forEach((e) => {
      e.attr('type', 'module')
    })

  return $
}

/* ----------------- js assets ---------------- */

export const getJsAssets = ([htmlPath, $]) =>
  $('script')
    .filter('[data-rollup-asset="true"]')
    .toArray()
    .map((elem) => $(elem).attr('src'))
    .map(getRelativePath(htmlPath))

export const mutateJsAssets = ($, fn) => {
  $('script')
    .filter('[data-rollup-asset="true"]')
    .toArray()
    .map((elem) => $(elem))
    .forEach((e) => {
      const value = fn(e.attr('src'))
      e.attr('src', value)
    })

  return $
}

/* -------------------- css ------------------- */

export const getCssHrefs = ([htmlPath, $]) =>
  $('link')
    .filter('[rel="stylesheet"]')
    .toArray()
    .map((elem) => $(elem).attr('href'))
    .map(getRelativePath(htmlPath))

export const mutateCssHrefs = ($, fn) => {
  $('link')
    .filter('[rel="stylesheet"]')
    .toArray()
    .map((elem) => $(elem))
    .forEach((e) => {
      const value = fn(e.attr('href'))
      e.attr('href', value)
    })

  return $
}

/* -------------------- img ------------------- */

export const getImgSrcs = ([htmlPath, $]) =>
  [
    // get img tags
    ...$('img')
      .not('[src^="http://"]')
      .not('[src^="https://"]')
      .not('[src^="data://"]')
      .not('[src^="/"]')
      .toArray()
      .map((elem) => $(elem).attr('src')),
    // get favicons
    ...$('link[rel="icon"]')
      .not('[src^="http://"]')
      .not('[src^="https://"]')
      .not('[src^="data://"]')
      .not('[src^="/"]')
      .toArray()
      .map((elem) => $(elem).attr('href')),
  ].map(getRelativePath(htmlPath))

export const mutateImgSrcs = ($, fn) => {
  $('img')
    .not('[src^="http://"]')
    .not('[src^="https://"]')
    .not('[src^="data://"]')
    .not('[src^="/"]')
    .toArray()
    .map((elem) => $(elem))
    .forEach((e) => {
      const value = fn(e.attr('src'))
      e.attr('src', value)
    })

  $('link[rel="icon"]')
    .not('[src^="http://"]')
    .not('[src^="https://"]')
    .not('[src^="data://"]')
    .not('[src^="/"]')
    .toArray()
    .map((elem) => $(elem))
    .forEach((e) => {
      const value = fn(e.attr('href'))
      e.attr('href', value)
    })

  return $
}
