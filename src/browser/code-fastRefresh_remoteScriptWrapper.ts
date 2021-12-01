import { eventName } from './fastRefresh_helpers'

const importPath = JSON.parse('%REMOTE_SCRIPT_PATH%')
const eventHandler = () => {
  import(importPath)
    .catch((err) => {
      console.error(`Could not import "${importPath}":`)
      console.error(err)
    })
    .then(() => {
      return window.removeEventListener(eventName, eventHandler)
    })
}

window.addEventListener(eventName, eventHandler)
