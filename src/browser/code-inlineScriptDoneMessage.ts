/* eslint-disable quotes */
import {
  InlineScriptDoneMessage,
  portName,
} from '../service-worker/handleInlineScripts'

const message: InlineScriptDoneMessage = {
  type: 'inline_script_done',
  id: JSON.parse(`%PAGE_ID%`),
}

const port = chrome.runtime.connect(portName)
port.postMessage(message)
port.disconnect()
