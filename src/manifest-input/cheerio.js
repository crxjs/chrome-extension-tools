import fs from 'fs'
import cheerio from 'cheerio'

export const loadHtml = filePath => {
  const htmlCode = fs.readFileSync(filePath, 'utf8')
  const $ = cheerio.load(htmlCode)

  return $
}

export const getScriptTags = $ => {
  const tags = []

  $('script').each((i, elem) => {
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
