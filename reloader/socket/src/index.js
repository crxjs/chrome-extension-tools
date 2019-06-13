import debounce from 'debounce'
import express from 'express'
import { Server } from 'http'
import SocketIO from 'socket.io'
import clientCode from './client.code'
import { PORT } from './CONSTANTS'
import * as handle from './event-handlers'

const name = 'Web socket reloader'

// NEXT: use ip:port instead of localHost:port
export const reloader = () => {
  const app = express()

  const http = Server(app)
  const io = SocketIO(http)

  return {
    name,

    startReloader(options, bundle, cb) {
      io.on('connection', handle.connect)

      http.listen(PORT, function() {
        console.log(`auto-reloader on localhost:${PORT}...`)
      })

      cb(false)

      // TODO: call cb when socket problem
      return io
    },

    createClientFiles() {
      return clientCode
    },

    updateManifest(manifest, path) {
      if (!manifest.background) {
        manifest.background = {}
      }
      const { scripts = [] } = manifest.background
      manifest.background.scripts = [path, ...scripts]
      manifest.background.persistent = true
      manifest.description =
        'DEVELOPMENT BUILD with auto-reloader script.'
    },

    reloadClients: debounce(handle.reload, 200),
  }
}
