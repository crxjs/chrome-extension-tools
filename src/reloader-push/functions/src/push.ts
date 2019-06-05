import * as admin from 'firebase-admin'

const sendMessage = (message: string) => (token: string) => {
  // Send a message to the device corresponding to the provided
  // registration token.
  return admin.messaging().send({
    data: {
      message,
    },
    token,
  })
}

export const pushClientReload = sendMessage('client-reload')

export const pushClientLoad = sendMessage('client-load')
