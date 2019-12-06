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

// TODO: Implement "buildStart" Cloud Function on Firebase
export const buildStart =
  process.env.NODE_ENV === 'test'
    ? // Don't stub in tests because firebase is mocked
      firebase.functions().httpsCallable('buildStart')
    : // Stub right now b/c it's not implemented
      async () => {}
