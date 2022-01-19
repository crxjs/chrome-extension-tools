import { format } from '../helpers'
import { getMessage } from '@extend-chrome/messages'
import jsesc from 'jsesc'

export const [sendReload, reloadStream] = getMessage('RELOAD')
export const [sendUpdateVersion, updateVersionStream] =
  getMessage('UPDATE_VERSION')

export const createDevWarning = () => format`
DEVELOPMENT build with simple auto-reloader
[${new Date().toLocaleTimeString()}] Waiting for changes...`

export const applyDevWarning = (code: string) =>
  code.replace('%DEV_WARNING%', jsesc(createDevWarning()))

export const getDevWarning = () => '%DEV_WARNING%'
