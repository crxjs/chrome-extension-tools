import { configureToMatchImageSnapshot } from 'jest-image-snapshot'
import { expect } from 'vitest'
import { version as viteVersion } from 'vite'

console.log(`\n🔧 Running tests with Vite ${viteVersion}\n`)

expect.extend({
  toMatchImageSnapshot: configureToMatchImageSnapshot({
    comparisonMethod: 'pixelmatch',
    failureThreshold: 0.1,
    failureThresholdType: 'percent',
    allowSizeMismatch: true,
  }),
})
