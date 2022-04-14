import { useState } from 'react'
import logo from './logo.svg'
import './App.css'

const crxLogo = chrome.runtime.getURL(logo)

function App() {
  const [count, setCount] = useState(0)

  return (
    <div className='App'>
      <header className='App-header'>
        <img src={crxLogo} className='App-logo' alt='logo' />
        {/* Added "+ CRX" */}
        <p>Hello Vite + React + CRX!</p>
        <p>
          <button type='button' onClick={() => setCount((count) => count + 1)}>
            count is: {count}
          </button>
        </p>
        <p>
          Edit <code>App.jsx</code> and save to test HMR updates.
        </p>
        <p>
          <a
            className='App-link'
            href='https://reactjs.org'
            target='_blank'
            rel='noopener noreferrer'
          >
            Learn React
          </a>
          {' | '}
          <a
            className='App-link'
            href='https://vitejs.dev/guide/features.html'
            target='_blank'
            rel='noopener noreferrer'
          >
            Vite Docs
          </a>
        </p>
      </header>
    </div>
  )
}

export default App
