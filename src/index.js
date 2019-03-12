import { deriveEntries } from '@bumble/manifest-entry-points'
import { readFileSync } from 'jsonfile'
import path from 'path'
import getScriptTags from '../src/script-tags'

export default function() {
  let assets

  return {
    name: 'inputJson',

    options({ input, ...options }) {
      const dirname = path.dirname(input)
      const manifest = readFileSync(input)

      const { js, css, html, img } = deriveEntries(manifest)
      assets = [...css, ...img, ...html]

      const inputs = [
        ...js,
        ...html.reduce(getScriptTags(dirname), []),
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
