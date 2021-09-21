import cheerio, { CheerioAPI } from 'cheerio'
import { isString } from './helpers'
import { FileType } from './types'

/**
 * Returns filenames relative to the html file,
 * which may be at any depth inside the root folder.
 */
export function parseHtml(
  source: string,
): Record<
  Exclude<
    FileType,
    'MANIFEST' | 'HTML' | 'JSON' | 'BACKGROUND' | 'CONTENT'
  >,
  string[]
> {
  const $ = cheerio.load(source)
  return {
    MODULE: getScriptSrc($),
    CSS: getCssHrefs($),
    IMAGE: getImgSrcs($),
    RAW: getJsAssets($),
  }
}

/* -------------------- SCRIPTS -------------------- */

export function getScripts($: CheerioAPI) {
  return $('script')
    .not('[data-rollup-asset]')
    .not('[src^="http:"]')
    .not('[src^="https:"]')
    .not('[src^="data:"]')
    .not('[src^="/"]')
    .toArray()
}

export function getScriptSrc($: CheerioAPI) {
  return getScripts($)
    .map((elem) => $(elem).attr('src'))
    .filter(isString)
}

/* ----------------- ASSET SCRIPTS ----------------- */

function getAssets($: CheerioAPI) {
  return $('script')
    .filter('[data-rollup-asset="true"]')
    .not('[src^="http:"]')
    .not('[src^="https:"]')
    .not('[src^="data:"]')
    .not('[src^="/"]')
    .toArray()
}

export function getJsAssets($: CheerioAPI) {
  return getAssets($)
    .map((elem) => $(elem).attr('src'))
    .filter(isString)
}

/* -------------------- css ------------------- */

function getCss($: CheerioAPI) {
  return $('link')
    .filter('[rel="stylesheet"]')
    .not('[href^="http:"]')
    .not('[href^="https:"]')
    .not('[href^="data:"]')
    .not('[href^="/"]')
    .toArray()
}

export function getCssHrefs($: CheerioAPI) {
  return getCss($)
    .map((elem) => $(elem).attr('href'))
    .filter(isString)
}

/* -------------------- img ------------------- */

function getImgs($: CheerioAPI) {
  return $('img')
    .not('[src^="http://"]')
    .not('[src^="https://"]')
    .not('[src^="data:"]')
    .toArray()
}

function getFavicons($: CheerioAPI) {
  return $('link[rel="icon"]')
    .not('[href^="http:"]')
    .not('[href^="https:"]')
    .not('[href^="data:"]')
    .toArray()
}

export function getImgSrcs($: CheerioAPI) {
  return [
    ...getImgs($).map((elem) => $(elem).attr('src')),
    ...getFavicons($).map((elem) => $(elem).attr('href')),
  ].filter(isString)
}
