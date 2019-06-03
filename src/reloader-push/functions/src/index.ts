import * as functions from 'firebase-functions'

// // Start writing Firebase Functions
// // https://firebase.google.com/docs/functions/typescript

export const _reloadClient = (
  data: any,
  context: functions.https.CallableContext,
): any => {
  // TODO: send push notification to client
}

export const reloadClient = functions.https.onCall(_reloadClient)
