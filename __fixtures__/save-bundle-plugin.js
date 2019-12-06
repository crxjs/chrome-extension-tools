import { getExtPath } from './utils'
import { writeJSON } from 'fs-extra'

export const saveBundle = (
  filepath = getExtPath('basic-bundle.json'),
) => {
  return {
    name: 'save-bundle-plugin',
    generateBundle(options, bundle) {
      if (!process.env.JEST_WATCH) {
        return writeJSON(filepath, bundle, { spaces: 2 })
      }
    },
  }
}
