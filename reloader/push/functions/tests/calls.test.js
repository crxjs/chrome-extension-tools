import * as admin from 'firebase-admin'
import { Mock } from 'firebase-nightlight'

import { cleanUpUsers, setUserTime } from '../src/users'
import {
  updateUserTime,
  registerToken,
  reloadClient,
  setupUser,
} from '../src/calls'
import { HttpsError } from 'firebase-functions/lib/providers/https'
import { pushClientLoad, pushClientReload } from '../src/push'

jest.mock('../src/users')
jest.mock('../src/push')

jest.mock('firebase-admin', () => {
  const initializeApp = jest.fn()

  const deleteUser = jest.fn(() => Promise.resolve())
  const auth = jest.fn(() => ({ deleteUser }))

  const database = jest.fn()

  database.ServerValue = {
    TIMESTAMP: {
      '.sv': 'timestamp',
    },
  }

  return { database, auth, initializeApp }
})

const uid = 'user1uid'
const token = 'token'
const context = { auth: { uid } }

let mockDatabase
let mockApp

beforeEach(() => {
  mockDatabase = {
    content: {
      users: {
        // This user is inactive
        user1uid: {
          clients: {
            token1: true,
            token2: true,
          },
          time: Date.now() - 2 * 60 * 1000,
        },
        // This user is active and has no clients
        user2uid: {
          time: Date.now() - 2 * 60 * 1000,
        },
        // Attempts to access this user's clients will throw an error
        user3uid: {
          time: Date.now() - 100,
          clients: {
            '.error': {
              code: 'database/boom',
              message: 'Boom!',
            },
          },
        },
      },
    },
  }

  const mock = new Mock({
    database: mockDatabase,
  })

  mockApp = mock.initializeApp()

  admin.database.mockImplementation(() => mockApp.database())
})

test('setupUser calls cleanUpUsers', async () => {
  await setupUser({ uid })

  expect(cleanUpUsers).toBeCalled()
})

test('setupUser calls setUserTime', async () => {
  await setupUser({ uid })

  expect(setUserTime).toBeCalledWith(uid)
})

test('updateUserTime throws if no auth', async () => {
  expect.assertions(3)

  return updateUserTime({}, {}).catch((error) => {
    expect(error).toBeInstanceOf(HttpsError)
    expect(error.code).toBe('unauthenticated')
    expect(error.message).toBe(
      'must be authenticated to update user time',
    )
  })
})

test('updateUserTime calls setUserTime', async () => {
  await updateUserTime({}, context)

  expect(setUserTime).toBeCalledWith(uid)
})

test('registerToken throws if no uid', async () => {
  expect.assertions(3)

  return registerToken({ token }).catch((error) => {
    expect(error).toBeInstanceOf(HttpsError)
    expect(error.code).toBe('invalid-argument')
    expect(error.message).toBe('uid must be defined')
  })
})

test('registerToken throws if no token', async () => {
  expect.assertions(3)

  return registerToken({ uid }).catch((error) => {
    expect(error).toBeInstanceOf(HttpsError)
    expect(error.code).toBe('invalid-argument')
    expect(error.message).toBe('token must be defined')
  })
})

test('registerToken throws if no user record', async () => {
  expect.assertions(3)

  const uid = 'noSuchUser'

  return registerToken({ uid, token }).catch((error) => {
    expect(error).toBeInstanceOf(HttpsError)
    expect(error.code).toBe('not-found')
    expect(error.message).toBe('uid does not exist')
  })
})

test('registerToken sets users/$user/clients/$token', async () => {
  const uid = 'user2uid'
  const token = 'new-token'

  await registerToken({ uid, token })

  const user = mockDatabase.content.users[uid]

  expect(user.clients[token]).toBe(true)
})

test('registerToken throws if set fail', async () => {
  expect.assertions(3)

  const uid = 'user3uid'

  return registerToken({ uid, token }).catch((error) => {
    expect(error).toBeInstanceOf(HttpsError)
    expect(error.code).toBe('data-loss')
    expect(error.message).toBe('could not store client token')
  })
})

test('registerToken calls pushClientLoad', async () => {
  await registerToken({ uid, token })

  expect(pushClientLoad).toBeCalled()
})

test('reloadClient throws if no auth', async () => {
  expect.assertions(3)

  return reloadClient({}, {}).catch((error) => {
    expect(error).toBeInstanceOf(HttpsError)
    expect(error.code).toBe('unauthenticated')
    expect(error.message).toBe(
      'must be authenticated to reload client',
    )
  })
})

test('reloadClient throws if no clients', async () => {
  expect.assertions(3)

  const uid = 'user2uid'
  const context = { auth: { uid } }

  return reloadClient({}, context).catch((error) => {
    expect(error).toBeInstanceOf(HttpsError)
    expect(error.code).toBe('not-found')
    expect(error.message).toBe('no registered clients')
  })
})

test('reloadClient calls pushClientReload for each client', async () => {
  await reloadClient({}, context)

  expect(pushClientReload).toBeCalledTimes(2)
})
