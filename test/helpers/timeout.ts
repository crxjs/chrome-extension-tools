/* eslint-env jest */

// nothing should timeout during debug
export const timeout = process.env.JEST_TIMEOUT
  ? parseInt(process.env.JEST_TIMEOUT)
  : 5000

export const jestSetTimeout = (ms: number) => {
  jest.setTimeout(Math.max(timeout, ms))
}

export const timeLimit = (ms: number, message: string) =>
  new Promise((resolve, reject) => {
    setTimeout(
      () => reject(new Error(message)),
      Math.max(timeout, ms),
    )
  })
