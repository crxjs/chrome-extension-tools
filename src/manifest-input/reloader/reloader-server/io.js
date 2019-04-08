import { Server } from 'http'
import express from 'express'
import SocketIO from 'socket.io'

const app = express()

export const http = Server(app)
export const io = SocketIO(http)
