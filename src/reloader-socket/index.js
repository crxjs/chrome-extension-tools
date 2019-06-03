import debounce from 'debounce'
import express from 'express'
import { Server } from 'http'
import SocketIO from 'socket.io'
import clientCode from './client.code'
import { PORT } from './CONSTANTS'
import * as handle from './event-handlers'

const app = express()

export const http = Server(app)
export const io = SocketIO(http)

// TODO: use ip:port instead of localHost:port
export function start() {
  io.on('connection', handle.connect)

  http.listen(PORT, function() {
    console.log(`auto-reloader on localhost:${PORT}...`)
  })

  return io
}

export const reload = debounce(handle.reload, 200)

export const getClientCode = () => clientCode
