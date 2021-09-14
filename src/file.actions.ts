import { sendParent } from 'xstate'
import { MachineOptions } from 'xstate'
import { File, FileEvent } from './file.model'

export const fileActions: MachineOptions<
  File,
  FileEvent
>['actions'] = {
  forwardToParent: sendParent((context, event) => event),
}
