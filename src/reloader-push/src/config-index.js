// Firebase manual chunk
import firebase from '@firebase/app'
import '@firebase/auth'
import '@firebase/functions'

import { config } from './config-firebase'

// Initialize full web app on import
firebase.initializeApp(config)

export { firebase }

export const loginAnonymously = async () => {
  // TODO: anonymous login to firebase
  // RESEARCH: login anonymously to firebase one time
}

export const updateUserTime = firebase
  .functions()
  .httpsCallable('updateUserTime')
  .catch((error) => {
    console.log('Could not update user.time in database')
    console.error(error)
  })

export const reloadClient = firebase
  .functions()
  .httpsCallable('reloadClient')
  .catch((error) => {
    console.log('Could not reload client')
    console.error(error)
  })
