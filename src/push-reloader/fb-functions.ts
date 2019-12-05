import { firebase } from './firebase'

export const login = async () => {
  const { user } = await firebase.auth().signInAnonymously()

  return user ? user.uid : undefined
}

export const update = firebase
  .functions()
  .httpsCallable('updateUserTime')

export const reload = firebase
  .functions()
  .httpsCallable('reloadClient')
