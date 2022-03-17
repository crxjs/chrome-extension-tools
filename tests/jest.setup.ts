import { configureToMatchImageSnapshot } from 'jest-image-snapshot'

expect.extend({
  toMatchImageSnapshot: configureToMatchImageSnapshot({
    customDiffConfig: {
      threshold: 0.15,
    },
    comparisonMethod: 'ssim',
    failureThreshold: 0.03,
    failureThresholdType: 'percent',
    allowSizeMismatch: true,
  }),
})

if (process.env.TIMEOUT) jest.setTimeout(parseInt(process.env.TIMEOUT))
else jest.setTimeout(45000)
