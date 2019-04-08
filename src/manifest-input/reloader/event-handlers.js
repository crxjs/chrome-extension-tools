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
  if (!socket) {
    // Wait and try again
    setTimeout(reload, 500)

    reloadCount++

    return false
  }

  if (reloadCount > 10) {
    console.log('unable to reload extension.')
  } else {
    socket.emit('reload')
  }

  reloadCount = 0

  return true
}
