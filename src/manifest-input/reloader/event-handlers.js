let socket
export const connect = newSocket => {
  socket = newSocket

  socket.on('disconnect', disconnect)

  function disconnect() {
    socket = null
  }

  socket.emit('connect')
}

let reloadCount = 0
export const reload = () => {
  if (socket) {
    socket.emit('reload')
    reloadCount = 0
  }

  if (reloadCount > 10) {
    throw new Error('unable to reload extension.')
  }

  // Wait and try again
  setTimeout(reload, 500)

  reloadCount++

  return null
}
