import * as functions from 'firebase-functions'
import * as admin from 'firebase-admin'

admin.initializeApp()

// Start writing Firebase Functions
// https://firebase.google.com/docs/functions/typescript

const rtdb = {
  users: {
    // A user represents a rollup --watch session
    $user: {
      // lastTime is when reloadClient fires
      lastTime: 'number',
      clients: {
        // A clientToken represents a single chrome extension install
        $clientToken: true,
      },
    },
  },
}

export const setupUser = functions.auth
  .user()
  .onCreate((user, context) => {
    // TODO: clean up users inactive > 5 minutes
    // - calculate deadline
    // - find users with user.time < deadline
    //   - remove user record
    //   - delete user
    // TODO: create new user record
  })

export const updateUserTime = functions.https.onCall(
  (_, context) => {
    // TODO: set users/${uid}/time to ServerValue.TIMESTAMP
    // TODO: reject if !users/${uid}?
  },
)

export const registerToken = functions.https.onRequest(
  (request, response) => {
    // TODO: add client token to users/${uid}/tokens
    // TODO: reject if uid is invalid
    // TODO: push "client-load" message to client
    // TODO: reject if FCM push error
    //   - "messaging/registration-token-not-registered" means token is expired
    // https://firebase.google.com/docs/cloud-messaging/send-message#admin_sdk_error_reference
  },
)

export const reloadClient = functions.https.onCall(
  (data, context) => {
    // TODO: retrieve user.clients
    // TODO: push "client-reload" to each client
  },
)
