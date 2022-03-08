import { configureToMatchImageSnapshot } from 'jest-image-snapshot'
import { join } from 'src/path'

expect.extend({
  toMatchImageSnapshot: configureToMatchImageSnapshot({
    comparisonMethod: 'ssim',
    failureThreshold: 0.02,
    failureThresholdType: 'percent',
    customDiffDir: join(process.cwd(), '__image_snapshot_diffs__'),
    allowSizeMismatch: true,
  }),
})

if (process.env.TIMEOUT) jest.setTimeout(parseInt(process.env.TIMEOUT))
else jest.setTimeout(30000)
