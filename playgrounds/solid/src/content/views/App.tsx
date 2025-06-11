import Logo from '@/assets/crx.svg'
import { createSignal } from 'solid-js'
import './App.css'

function App() {
  const [show, setShow] = createSignal(false)
  const toggle = () => setShow(!show())

  return (
    <div class="popup-container">
      {show() && (
        <div class={`popup-content ${show() ? 'opacity-100' : 'opacity-0'}`}>
          <h1>HELLO CRXJS</h1>
        </div>
      )}
      <button class="toggle-button" onClick={toggle}>
        <img src={Logo} alt="CRXJS logo" class="button-icon" />
      </button>
    </div>
  )
}

export default App
