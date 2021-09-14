import { createMachine } from 'xstate'
import { createScriptModel, Script } from './file.model'

const context: Script = {
  id: 'id placeholder',
  fileName: 'filename placeholder',
  manifestPath: 'manifest jsonpath placeholder',
  type: 'chunk',
}
const model = createScriptModel(context)
export const scriptFile = createMachine<typeof model>({
  context: model.initialContext,
  on: {
    ERROR: { actions: 'forwardToParent', target: '.error' },
  },
  initial: 'write',
  states: {
    write: {
      invoke: { src: 'emitFile', onDone: 'watch' },
    },
    watch: {
      invoke: { src: 'watchFile' },
      on: { START: 'write' },
    },
    error: { entry: 'logError' },
  },
})
