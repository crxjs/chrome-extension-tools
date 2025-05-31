import { configureToMatchImageSnapshot } from 'jest-image-snapshot'
import { expect } from 'vitest'

expect.extend({
  toMatchImageSnapshot: configureToMatchImageSnapshot({
    comparisonMethod: 'pixelmatch',
    failureThreshold: 0.1,
    failureThresholdType: 'percent',
    allowSizeMismatch: true,
  }),
})
