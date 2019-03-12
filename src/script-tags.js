import path from 'path'
import fs from 'fs'
import cheerio from 'cheerio'

export const getScriptTags = dirname => (scripts, name) => {
  const filePath = path.join(dirname, name)
  const htmlCode = fs.readFileSync(filePath, 'utf8')
  const tags = []
  const $ = cheerio.load(htmlCode)

  $('script').each((i, elem) => {
    tags[i] = $(elem).attr('src')
  })

  return scripts.concat(tags)
}
