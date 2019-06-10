import * as admin from 'firebase-admin'
import { Mock } from 'firebase-nightlight'
import { cleanUpUsers, setUserTime } from '../src/users'

jest.mock('firebase-admin', () => {
  const deleteUser = jest.fn(() => Promise.resolve())
  const auth = jest.fn(() => ({ deleteUser }))

  const database = jest.fn()

  database.ServerValue = {
    get TIMESTAMP() {
      return Date.now()
    },
  }

  return { database, auth }
})

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
          time: 0,
        },
        // This user is active and has 2 clients
        user2uid: {
          clients: {
            token3: true,
            token4: true,
          },
          time: Date.now() - 2 * 60 * 1000,
        },
        // This user was just created and has no clients
        user3uid: {
          time: Date.now() - 100,
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

test('cleanUpUsers removes inactive users from db', async () => {
  await cleanUpUsers()

  const { users } = mockDatabase.content

  expect(users.user1uid).toBeUndefined()
})

test('cleanUpUsers deletes inactive user records', async () => {
  await cleanUpUsers()

  expect(admin.auth().deleteUser).toBeCalledWith('user1uid')
})

test('cleanUpUsers does not alter active users', async () => {
  const { users: before } = mockDatabase.content

  await cleanUpUsers()

  const { users: after } = mockDatabase.content

  expect(before).not.toEqual(after)

  expect(before.user2uid).toEqual(after.user2uid)
  expect(before.user3uid).toEqual(after.user3uid)
})

test('setUserTime creates a user record', async () => {
  await setUserTime('user4uid')

  const { users } = mockDatabase.content

  expect(users.user4uid).toBeDefined()
})

test('setUserTime updates a user record', async () => {
  const now = Date.now()

  await setUserTime('user1uid')

  const { users } = mockDatabase.content

  expect(users.user1uid.time).toBeGreaterThanOrEqual(now)
})

test('setUserTime does not alter other users on create', async () => {
  const { users: before } = mockDatabase.content

  await setUserTime('user4uid')

  const { users: after } = mockDatabase.content

  expect(before).not.toEqual(after)

  expect(before.user1uid).toEqual(after.user1uid)
  expect(before.user2uid).toEqual(after.user2uid)
  expect(before.user3uid).toEqual(after.user3uid)
})

test('setUserTime does not alter other users on update', async () => {
  const { users: before } = mockDatabase.content

  await setUserTime('user3uid')

  const { users: after } = mockDatabase.content

  expect(before).not.toEqual(after)

  expect(before.user1uid).toEqual(after.user1uid)
  expect(before.user2uid).toEqual(after.user2uid)
  expect(before.user3uid).not.toEqual(after.user3uid)
})
