import { getExtPath } from './utils'
import { writeJSON } from 'fs-extra'

export const saveBundle = (
  filepath = getExtPath('basic-bundle.json'),
) => {
  return {
    name: 'save-bundle-plugin',
    generateBundle(options, bundle) {
      if (!process.env.JEST_WATCH) {
        // this.warn(`Writing bundle as json:\n${filepath}`)
        return writeJSON(filepath, bundle, { spaces: 2 })
      } else {
        // this.warn('Not writing bundle as json.')
      }
    },
  }
}
