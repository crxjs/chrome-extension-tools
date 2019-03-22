import path from 'path'
import fs from 'fs-extra'
import cheerio from 'cheerio'

export const loadHtml = filePath => {
  const htmlCode = fs.readFileSync(filePath, 'utf8')
  const $ = cheerio.load(htmlCode)

  return $
}

const getRelativePath = htmlPath => p =>
  path.join(path.dirname(htmlPath), p)

export const getJsEntries = ([htmlPath, $]) => [
  htmlPath,
  $('script')
    .not('[data-rollup-asset]')
    .toArray()
    .map(elem => $(elem).attr('src'))
    .map(getRelativePath(htmlPath)),
]

export const getJsAssets = ([htmlPath, $]) => [
  htmlPath,
  $('script')
    .filter('[data-rollup-asset="true"]')
    .toArray()
    .map(elem => $(elem).attr('src'))
    .map(getRelativePath(htmlPath)),
]

export const getCssHrefs = ([htmlPath, $]) => [
  htmlPath,
  $('link')
    .filter('[rel="stylesheet"]')
    .toArray()
    .map(elem => $(elem).attr('href'))
    .map(getRelativePath(htmlPath)),
]

export const getImgSrc = ([htmlPath, $]) => [
  htmlPath,
  [
    // get img tags
    ...$('img')
      .not('[src|="http:-https:-data:-/"]')
      .toArray()
      .map(elem => $(elem).attr('src')),
    // get favicons
    ...$('link[rel="icon"]')
      .not('[href|="http:-https:-data:-/"]')
      .toArray()
      .map(elem => $(elem).attr('href')),
  ].map(getRelativePath(htmlPath)),
]
