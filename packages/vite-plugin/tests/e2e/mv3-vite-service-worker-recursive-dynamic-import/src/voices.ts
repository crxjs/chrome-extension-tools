import { seed } from './shared-data'

import('./nested').then(({ nestedValue }) => {
  ;(
    globalThis as typeof globalThis & { __nestedValue?: string }
  ).__nestedValue = nestedValue
})

export const voices = [`${seed}-Alice`, `${seed}-Bob`]
