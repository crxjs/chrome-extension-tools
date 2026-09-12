import { useEffect, useState } from 'react'

const message = 'React MAIN world HMR after update'

function App() {
  const [count, setCount] = useState(0)

  useEffect(() => {
    window.crxReactMainWorldHmrMessage = message
  })

  return (
    <section id='crx-react-main-world-hmr'>
      <p>{message}</p>
      <button type='button' onClick={() => setCount((value) => value + 1)}>
        count is: {count}
      </button>
    </section>
  )
}

export default App
