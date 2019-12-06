const signInAnonymously = jest.fn(() => ({
  user: { uid: 'fake_uid' },
}))

const auth = jest.fn(() => ({
  signInAnonymously,
}))

const cloudFunction = jest.fn(async () => {})
const httpsCallable = jest.fn(() => cloudFunction)

const functions = jest.fn(() => ({
  httpsCallable,
}))

const initializeApp = jest.fn(() => ({
  auth,
  functions,
}))

export const firebase = {
  initializeApp,
  auth,
  functions,
}
