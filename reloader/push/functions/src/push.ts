import * as admin from 'firebase-admin'

const sendMessage = (message: string) => (token: string) => {
  console.log('sending push message:', message)
  // Send a message to the device corresponding to the provided
  // registration token.
  return admin.messaging().send({
    data: {
      message,
    },
    token,
  })
}

export const pushClientLoad = sendMessage('client-load')
export const pushClientReload = sendMessage('client-reload')
