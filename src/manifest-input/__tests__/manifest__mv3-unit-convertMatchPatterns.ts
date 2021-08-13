import { convertMatchPatterns } from '../convertMatchPatterns'

test.each`
  matchPattern                                  | expected
  ${'http://localhost:3000/*'}                  | ${'http://localhost:3000/*'}
  ${'http://localhost:*/*'}                     | ${'http://localhost:*/*'}
  ${'*://www.google.com/search*'}               | ${'*://www.google.com/*'}
  ${'https://*.expedia.com/Flights*'}           | ${'https://*.expedia.com/*'}
  ${'https://*.kayak.com/*'}                    | ${'https://*.kayak.com/*'}
  ${'https://flights.booking.com/*'}            | ${'https://flights.booking.com/*'}
  ${'https://www.priceline.com/m/fly/search/*'} | ${'https://www.priceline.com/*'}
`('converts match patterns', ({ matchPattern, expected }) => {
  expect(convertMatchPatterns(matchPattern)).toBe(expected)
})
