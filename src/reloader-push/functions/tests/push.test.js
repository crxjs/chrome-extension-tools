import * as admin from 'firebase-admin'
import { pushClientLoad, pushClientReload } from '../src/push'

jest.mock('firebase-admin', () => {
  const send = jest.fn(() => Promise.resolve())
  const messaging = jest.fn(() => ({ send }))

  return { messaging }
})

test('pushClientLoad calls messaging.send', async () => {
  const token = 'token'

  await pushClientLoad(token)

  expect(admin.messaging().send).toBeCalledWith({
    data: {
      message: 'client-load',
    },
    token,
  })
})

test('pushClientReload calls messaging.send', async () => {
  const token = 'token'

  await pushClientReload(token)

  expect(admin.messaging().send).toBeCalledWith({
    data: {
      message: 'client-reload',
    },
    token,
  })
})
