import * as functions from 'firebase-functions'
import * as calls from './calls'

export const setupUser = functions.auth
  .user()
  .onCreate(calls.setupUser)

export const updateUserTime = functions.https.onCall(
  calls.updateUserTime,
)

export const registerToken = functions.https.onCall(
  calls.registerToken,
)

export const reloadClient = functions.https.onCall(
  calls.reloadClient,
)
