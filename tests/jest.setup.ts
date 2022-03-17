import { configureToMatchImageSnapshot } from 'jest-image-snapshot'

expect.extend({
  toMatchImageSnapshot: configureToMatchImageSnapshot({
    comparisonMethod: 'pixelmatch',
    failureThreshold: 0.1,
    failureThresholdType: 'percent',
    allowSizeMismatch: true,
  }),
})

if (process.env.TIMEOUT) jest.setTimeout(parseInt(process.env.TIMEOUT))
else jest.setTimeout(45000)
