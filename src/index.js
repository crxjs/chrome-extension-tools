import { deriveEntries } from '@bumble/manifest-entry-points'

export default function() {
  return {
    name: 'inputJson',
    options({ input, ...options }) {
      const entries = deriveEntries(input)

      return { input: entries, ...options }
    },
  }
}
