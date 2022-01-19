export const mockedDate = '2021-12-07'
export const mockedNow = jest.fn(() =>
  new Date(mockedDate).getTime(),
)

export const stubDate = () => {
  Date.now = mockedNow

  /**
   * Set Date to a new Variable
   */
  const MockedRealDate = global.Date

  /**
   *  Mock Real date with the date passed from the test
   */
  ;(global.Date as any) = class extends MockedRealDate {
    constructor() {
      super()
      return new MockedRealDate(mockedDate)
    }
  }

  /**
   * Reset global.Date to original Date (MockedRealDate) after every test
   */
  afterEach(() => {
    global.Date = MockedRealDate
  })
}
