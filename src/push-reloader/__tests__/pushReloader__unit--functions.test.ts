import { login } from '../fb-functions'
import { firebase } from '../firebase'

jest.mock('../firebase.ts')

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
