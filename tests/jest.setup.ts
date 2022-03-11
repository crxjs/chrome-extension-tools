import { configureToMatchImageSnapshot } from 'jest-image-snapshot'
import { resolve } from 'src/path'

expect.extend({
  toMatchImageSnapshot: configureToMatchImageSnapshot({
    comparisonMethod: 'ssim',
    failureThreshold: 0.02,
    failureThresholdType: 'percent',
    customDiffDir: resolve(__dirname, '__image_snapshot_diffs__'),
    allowSizeMismatch: true,
  }),
})

if (process.env.TIMEOUT) jest.setTimeout(parseInt(process.env.TIMEOUT))
else jest.setTimeout(45000)
