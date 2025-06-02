console.log('[Popup] Script loaded')

let updateCount = 0

// Test HMR by changing this message
console.log('[Popup] WebSocket HMR is active!')

// Update the update count display
function updateDisplay() {
  const countElement = document.getElementById('update-count')
  if (countElement) {
    countElement.textContent = `UpdatesPOPUP.TS: ${updateCount}`
  }
}

setInterval(() => {
  updateCount++
  updateDisplay()
}, 1000)

// Test HMR updates
if (import.meta.hot) {
  console.log('[Popup] HMR update received!2')
  import.meta.hot.accept(() => {
    console.log('[Popup] HMR update received!')
    updateCount++
    updateDisplay()

    // Flash the status indicator
    const statusElement = document.getElementById('status')
    if (statusElement) {
      statusElement.textContent = 'HMR Update Received!'
      statusElement.style.backgroundColor = '#2196F3'
      setTimeout(() => {
        statusElement.textContent = 'HMR Connected3'
        statusElement.style.backgroundColor = '#4CAF50'
      }, 11000)
    }
  })
}

export {}
