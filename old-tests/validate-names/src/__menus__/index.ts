import {
  createContextMenu,
  createContextMenuStream,
} from './create'
import {
  updateContextMenu,
  updateContextMenuStream,
} from './update'
import {
  removeContextMenu,
  removeContextMenuStream,
} from './remove'
import { contextMenuClickStream } from './clickStream'

export const menus = {
  create: createContextMenu,
  update: updateContextMenu,
  remove: removeContextMenu,
  // removeAll: removeAllContextMenus,
  createStream: createContextMenuStream.asObservable(),
  updateStream: updateContextMenuStream.asObservable(),
  removeStream: removeContextMenuStream.asObservable(),
  // removeAllStream: removeAllContextMenusStream.asObservable(),
  clickStream: contextMenuClickStream,
}
