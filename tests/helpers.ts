const mockedDate = '2022-01-26T00:00:00.000Z'
const mockedNow = jest.fn(() => new Date(mockedDate).getTime())

export const mockDate = () => {
  Date.now = mockedNow

  /**
   * Set Date to a new Variable
   */
  const MockedRealDate = global.Date

  /**
   *  Mock Real date with the date passed from the test
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(global.Date as any) = class extends MockedRealDate {
    constructor() {
      super()
      return new MockedRealDate(mockedDate)
    }
  }
}
