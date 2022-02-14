import { configureToMatchImageSnapshot } from 'jest-image-snapshot'

expect.extend({
  toMatchImageSnapshot: configureToMatchImageSnapshot({
    customDiffConfig: {
      threshold: 0.3,
    },
    failureThreshold: 0.04,
  }),
})

if (process.env.TIMEOUT) jest.setTimeout(parseInt(process.env.TIMEOUT))
else jest.setTimeout(30000)
