import * as functions from 'firebase-functions'
import * as admin from 'firebase-admin'
import { HttpsError } from 'firebase-functions/lib/providers/https'
import { pushClientLoad, pushClientReload } from './push'

admin.initializeApp()

const cleanUpUsers = async () => {
  const deadline =
    admin.database.ServerValue.TIMESTAMP - 6 * 60 * 1000

  const inactiveUsers = admin
    .database()
    .ref('users')
    .orderByChild('time')
    .endAt(deadline)

  const inactiveSnap = await inactiveUsers.once('value')

  const promises: Promise<void>[] = []

  inactiveSnap.forEach((snap) => {
    if (snap.key) {
      promises.push(admin.auth().deleteUser(snap.key))
    }

    promises.push(snap.ref.remove())
  })

  return Promise.all(promises)
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

export const registerToken = functions.https.onCall(
  async ({ uid, token }, context) => {
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
      throw new HttpsError('not-found', 'uid does not exist')
    }

    await userSnap
      .child(`clients/${token}`)
      .ref.set(true)
      .catch((e) => {
        console.error(e)

        throw new HttpsError(
          'data-loss',
          'could not store client token',
        )
      })

    return pushClientLoad(token)
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

    return Promise.all(clientTokens.map(pushClientReload))
  },
)
