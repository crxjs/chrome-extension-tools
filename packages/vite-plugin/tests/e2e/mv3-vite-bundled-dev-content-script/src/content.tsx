import React from 'react'
import ReactDOM from 'react-dom'

function Marker() {
  return (
    <div
      id='bundled-dev-content-script-test'
      style={{
        background: '#ffffff',
        border: '2px solid #0d9488',
        color: '#111111',
        font: '13px/1.3 sans-serif',
        padding: '8px 10px',
        position: 'fixed',
        right: '10px',
        top: '10px',
        zIndex: 2147483647,
      }}
    >
      Vite bundled dev React content script loaded
    </div>
  )
}

const container = document.createElement('div')
document.body.appendChild(container)

ReactDOM.render(
  <React.StrictMode>
    <Marker />
  </React.StrictMode>,
  container,
)
