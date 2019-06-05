import * as functions from 'firebase-functions'
import * as admin from 'firebase-admin'
import { HttpsError } from 'firebase-functions/lib/providers/https'
import { pushClientLoad, pushClientReload } from './push'

admin.initializeApp()

const rtdb = {
  users: {
    // A user represents a rollup --watch session
    $user: {
      // user/time is when reloadClient fires
      time: 'number',
      clients: {
        // A clientToken represents a single chrome extension install
        $clientToken: true,
      },
    },
  },
}

const cleanUpUsers = async () => {
  const deadline =
    admin.database.ServerValue.TIMESTAMP - 6 * 60 * 1000

  // TODO: index db/users by user.time in rules
  const inactiveUsers = admin
    .database()
    .ref('users')
    .orderByChild('time')
    .endAt(deadline)

  const inactiveSnap = await inactiveUsers.once('value')

  const removals: Promise<void>[] = []

  inactiveSnap.forEach((snap) => {
    // RESEARCH: use admin sdk to remove user from project by uid
    // TODO: delete user by key

    removals.push(snap.ref.remove())
  })

  return Promise.all([...removals])
}

const setUserTime = async (uid: string) => {
  return admin
    .database()
    .ref(`users/${uid}/time`)
    .set(admin.database.ServerValue.TIMESTAMP)
}

export const setupUser = functions.auth
  .user()
  .onCreate(async (user, context) => {
    return Promise.all([cleanUpUsers(), setUserTime(user.uid)])
  })

export const updateUserTime = functions.https.onCall(
  (_, context) => {
    if (!context.auth) {
      throw new HttpsError(
        'unauthenticated',
        'must be authenticated to update user time',
      )
    }

    return setUserTime(context.auth.uid)
  },
)

export const registerToken = functions.https.onRequest(
  async (request, response) => {
    try {
      // RESEARCH: get request json data
      // TODO: get uid from request
      const { uid, token } = {
        uid: 'uid',
        token: 'token',
      }

      if (!uid) {
        throw new HttpsError(
          'invalid-argument',
          'uid must be defined',
        )
      }

      if (!token) {
        throw new HttpsError(
          'invalid-argument',
          'token must be defined',
        )
      }

      const userSnap = await admin
        .database()
        .ref(`users/${uid}`)
        .once('value')

      if (!userSnap.exists()) {
        // RESEARCH: how to send an error response
        // TODO: adapt to https request, cannot use HttpsError
        throw new HttpsError('not-found', 'uid does not exist')
      }

      await userSnap
        .child(`token/${token}`)
        .ref.set(true)
        .catch((e) => {
          const message = `could not set token at users/${uid}/tokens`

          console.log(message)
          console.error(e)

          throw new HttpsError('internal', message)
        })

      await pushClientLoad(admin.messaging())(token)

      // RESEARCH: send response on success
    } catch (error) {
      switch (error.code) {
        case 'messaging/invalid-registration-token':
        // TODO: handle invalid FCM token

        case 'messaging/registration-token-not-registered':
        // TODO: reject if FCM push error
        //   - "messaging/registration-token-not-registered" means token is expired
        // https://firebase.google.com/docs/cloud-messaging/send-message#admin_sdk_error_reference

        case 'not-found':
        // TODO: handle uid not found error

        case 'invalid-argument':
        // TODO: handle invalid argument

        default:
        // TODO: reject default internal error
      }
    }
  },
)

export const reloadClient = functions.https.onCall(
  async (data, context) => {
    if (!context.auth) {
      throw new HttpsError(
        'unauthenticated',
        'must be authenticated to reload client',
      )
    }

    // TODO: retrieve user.clients
    const clientsSnap = await admin
      .database()
      .ref(`users/${context.auth.uid}/clients`)
      .once('value')

    if (!clientsSnap.exists()) {
      throw new HttpsError('not-found', 'no registered clients')
    }

    const clientTokens: string[] = []

    clientsSnap.forEach(({ key }) => {
      if (key) {
        clientTokens.push(key)
      }
    })

    return Promise.all(
      clientTokens.map(pushClientReload(admin.messaging())),
    )
  },
)
