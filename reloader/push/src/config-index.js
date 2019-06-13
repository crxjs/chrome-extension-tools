// Firebase manual chunk
import fb from '@firebase/app'
import '@firebase/auth'
import '@firebase/functions'

import { config } from './CONFIG'

// Initialize full web app on import
export const firebase = fb.initializeApp(config, 'reloader')

export const login = async (cb) => {
  const { user } = await firebase.auth().signInAnonymously()

  const unsubscribe = firebase
    .auth()
    .onAuthStateChanged((user) => {
      const shouldRestart = !user

      if (shouldRestart) {
        unsubscribe()
      }

      cb(shouldRestart)
    })

  return user.uid
}

export const update = firebase
  .functions()
  .httpsCallable('updateUserTime')

export const reload = firebase
  .functions()
  .httpsCallable('reloadClient')
