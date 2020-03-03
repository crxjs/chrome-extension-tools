import { reduceToRecord } from '../reduceToRecord'

test('Throws if srcDir is null', () => {
  try {
    reduceToRecord(null)
  } catch (error) {
    expect(error).toEqual(
      new TypeError('srcDir is null or undefined'),
    )
  }
})

test('Throws if srcDir is undefined', () => {
  try {
    // @ts-ignore
    reduceToRecord()
  } catch (error) {
    expect(error).toEqual(
      new TypeError('srcDir is null or undefined'),
    )
  }
})

test('Throws if script files with different extensions share the same name', () => {
  expect.assertions(1)

  const errorMessage =
    'Script files with different extensions should not share names:\n\n"src/options.ts"\nwill overwrite\n"src/options.js"'

  try {
    reduceToRecord('src')(
      {
        options: 'src/options.js',
      },
      'src/options.ts',
    )
  } catch (error) {
    expect(error).toEqual(new TypeError(errorMessage))
  }
})
