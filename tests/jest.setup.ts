import { configureToMatchImageSnapshot } from 'jest-image-snapshot'
import { join } from 'src/path'

expect.extend({
  toMatchImageSnapshot: configureToMatchImageSnapshot({
    customDiffConfig: {
      threshold: 0.3,
    },
    failureThreshold: 0.04,
    failureThresholdType: 'percent',
    customDiffDir: join(process.cwd(), '__image_snapshot_diffs__'),
  }),
})

if (process.env.TIMEOUT) jest.setTimeout(parseInt(process.env.TIMEOUT))
else jest.setTimeout(30000)
