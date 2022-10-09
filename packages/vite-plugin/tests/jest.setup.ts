import { configureToMatchImageSnapshot } from 'jest-image-snapshot'
import { expect, vi, beforeEach, afterEach } from 'vitest'

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

expect.extend({
  toMatchImageSnapshot: configureToMatchImageSnapshot({
    comparisonMethod: 'pixelmatch',
    failureThreshold: 0.1,
    failureThresholdType: 'percent',
    allowSizeMismatch: true,
  }),
})
