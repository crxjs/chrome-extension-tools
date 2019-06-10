import * as admin from 'firebase-admin'
import {
  CallableContext,
  HttpsError,
} from 'firebase-functions/lib/providers/https'
import { pushClientLoad, pushClientReload } from './push'
import { cleanUpUsers, setUserTime } from './users'

admin.initializeApp()

export const setupUser = async (user: admin.auth.UserRecord) => {
  return Promise.all([cleanUpUsers(), setUserTime(user.uid)])
}

export const updateUserTime = async (
  _: any,
  context: CallableContext,
) => {
  if (!context.auth) {
    throw new HttpsError(
      'unauthenticated',
      'must be authenticated to update user time',
    )
  }

  return setUserTime(context.auth.uid)
}

export const registerToken = async ({ uid, token }: any) => {
  if (typeof uid !== 'string') {
    throw new HttpsError(
      'invalid-argument',
      'uid must be defined',
    )
  }

  if (typeof token !== 'string') {
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

  try {
    await userSnap.child(`clients/${token}`).ref.set(true)
  } catch (e) {
    throw new HttpsError(
      'data-loss',
      'could not store client token',
    )
  }

  return pushClientLoad(token)
}

export const reloadClient = async (
  data: any,
  context: CallableContext,
) => {
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
}
