import * as admin from 'firebase-admin'

export const cleanUpUsers = async () => {
  // Six minutes ago
  const deadline = Date.now() - 6 * 60 * 1000

  const inactiveUsers = admin
    .database()
    .ref('users')
    .orderByChild('time')
    // Anything from before the deadline
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

export const setUserTime = async (uid: string) => {
  return admin
    .database()
    .ref(`users/${uid}/time`)
    .set(admin.database.ServerValue.TIMESTAMP)
}
