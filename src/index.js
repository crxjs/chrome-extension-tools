import path from 'path'
import fs from 'mz/fs'
import { readFileSync } from 'jsonfile'
import { deriveEntries } from '@bumble/manifest-entry-points'
import { getCssLinks, getScriptTags, loadHtml } from './cheerio'

const predObj = {
  js: s => /\.js$/.test(s),
  css: s => /\.css$/.test(s),
  html: s => /\.html$/.test(s),
  img: s => /\.png$/.test(s),
  filter: v =>
    typeof v === 'string' &&
    v.includes('.') &&
    !v.includes('*') &&
    !/^https?:/.test(v),
}

const getBasename = asset => path.basename(asset)

export default function() {
  const assets = { css: [], img: [], html: [], html$: [] }

  return {
    name: 'inputJson',

    options({ input, ...options }) {
      const dirname = path.dirname(input)
      const transform = name => path.join(dirname, name)

      const manifest = readFileSync(input)

      const { js, css, html, img } = deriveEntries(manifest, {
        ...predObj,
        transform,
      })

      const cheerios = html.map(loadHtml)

      const cssLinks = cheerios
        .map(getCssLinks)
        .flat()
        .map(transform)

      const jsScripts = cheerios
        .map(getScriptTags)
        .flat()
        .map(transform)

      assets.css.push(...css)
      assets.css.push(...cssLinks)
      assets.img.push(...img)
      assets.html.push(...html)
      assets.html$.push(...cheerios)

      const inputs = [...js, ...jsScripts]

      return {
        ...options,
        input: inputs,
      }
    },

    async buildStart() {
      const emitAssetFrom = srcArray => (name, i) => {
        this.emitAsset(name, srcArray[i])
      }

      // html links and script tags may need updated
      const htmlSrc = assets.html$.map($ => $.html())

      const [cssSrc, imgSrc] = await Promise.all([
        Promise.all(assets.css.map(asset => fs.readFile(asset))),
        Promise.all(assets.img.map(asset => fs.readFile(asset))),
      ])

      assets.css.map(getBasename).forEach(emitAssetFrom(cssSrc))

      assets.img.map(getBasename).forEach(emitAssetFrom(imgSrc))

      assets.html
        .map(getBasename)
        .forEach(emitAssetFrom(htmlSrc))
    },
  }
}
