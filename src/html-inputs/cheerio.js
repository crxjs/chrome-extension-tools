import fs from 'fs-extra'
import cheerio from 'cheerio'

export const loadHtml = filePath => {
  const htmlCode = fs.readFileSync(filePath, 'utf8')
  const $ = cheerio.load(htmlCode)

  return $
}

export const getJsEntries = $ => {
  const tags = []

  $('script')
    .not('[data-rollup-asset]')
    .each((i, elem) => {
      tags[i] = $(elem).attr('src')
    })

  return tags
}

// Get 'data-rollup-asset'
export const getJsAssets = $ => {
  const tags = []

  $('script[data-rollup-asset]').each((i, elem) => {
    tags[i] = $(elem).attr('src')
  })

  return tags
}

export const getCssLinks = $ => {
  const tags = []

  $('link[rel="stylesheet"]').each((i, elem) => {
    tags[i] = $(elem).attr('href')
  })

  return tags
}

export const getImgSrc = $ => {
  const tags = []

  $('img').each((i, elem) => {
    tags[i] = $(elem).attr('src')
  })

  return tags
}
