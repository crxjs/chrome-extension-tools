let socket

export const connect = s => {
  socket = s

  // console.log('the extension connected')

  const disconnect = () => {
    // console.log('the extension disconnected')
  }

  socket.emit('connect')

  socket.on('disconnect', disconnect)
}

let reloadCount = 0
export const reload = () => {
  if (reloadCount > 10) {
    throw new Error('unable to reload extension.')
  }

  if (socket) {
    socket.emit('reload')
    reloadCount = 0
  } else {
    setTimeout(reload, 500)

    reloadCount++

    return null
  }
}
