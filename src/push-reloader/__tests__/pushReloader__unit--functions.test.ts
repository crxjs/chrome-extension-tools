import { login } from '../fb-functions'
import { firebase } from '../firebase'

jest.mock('../firebase.ts', () => {
  const signInAnonymously = jest.fn(() => ({
    user: { uid: 'fake_uid' },
  }))
  const auth = jest.fn(() => ({
    signInAnonymously,
  }))

  const httpsCallable = jest.fn()
  const functions = jest.fn(() => ({
    httpsCallable,
  }))

  const initializeApp = jest.fn(() => ({
    auth,
    functions,
  }))

  return {
    firebase: {
      initializeApp,
      auth,
      functions,
    },
  }
})

test('signs in anonymously', async () => {
  const result = await login()

  expect(result).toBeDefined()
  expect(result).toBe('fake_uid')
})

test('handles unsuccessful signin', async () => {
  // @ts-ignore
  const signInAnonymously = firebase.auth()
    .signInAnonymously as jest.MockInstance<
    Promise<{ user?: string }>,
    []
  >

  signInAnonymously.mockImplementationOnce(() =>
    Promise.resolve({}),
  )

  const result = await login()

  expect(result).toBeUndefined()
})
