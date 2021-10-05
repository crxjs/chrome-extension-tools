import { format } from '$src/helpers'
import { getMessage } from '@extend-chrome/messages'

export const [sendReload, reloadStream] = getMessage('RELOAD')
export const [sendUpdateVersion, updateVersionStream] =
  getMessage('UPDATE_VERSION')

export const devWarning = format`
DEVELOPMENT build with simple auto-reloader
[${new Date().toLocaleTimeString()}] Waiting for changes...`
