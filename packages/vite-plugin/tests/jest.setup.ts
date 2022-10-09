import { configureToMatchImageSnapshot } from 'jest-image-snapshot'
import { afterEach, beforeEach, expect, vi } from 'vitest'

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
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
