import debounce from 'debounce'
import clientCode from './client.code.js'
import { PORT } from './CONSTANTS'
import * as handle from './reloader-server/handlers'
import { http, io } from './reloader-server/io'

export function start() {
  io.on('connection', handle.connect)

  http.listen(PORT, function() {
    console.log('auto-reloader waiting for extension...')
  })

  return io
}

export const reload = debounce(handle.reload, 200)

export const client = clientCode
