import { deriveEntries } from '@bumble/manifest-entry-points'
import { readFileSync } from 'jsonfile'
import path from 'path'
import { loadHtml, getScriptTags, getCssLinks } from './cheerio'

export default function() {
  let assets

  return {
    name: 'inputJson',

    options({ input, ...options }) {
      const dirname = path.dirname(input)
      const manifest = readFileSync(input)

      const { js, css, html, img } = deriveEntries(manifest)
      const cheerios = html.map(loadHtml(dirname))

      assets = [
        ...css,
        ...img,
        ...html,
        ...cheerios.map(getCssLinks).flat(),
      ]

      const inputs = [
        ...js,
        ...cheerios.map(getScriptTags).flat(),
      ]

      return {
        ...options,
        input: inputs.map(name => path.join(dirname, name)),
      }
    },

    buildStart() {
      assets.map(asset => {
        this.emitAsset(asset)
      })
    },
  }
}
