// Firebase manual chunk
import fb from 'firebase/app'
import 'firebase/auth'
import 'firebase/functions'

import { config } from './CONFIG'

// Initialize full web app on import
export const firebase = fb.initializeApp(config, 'reloader')
