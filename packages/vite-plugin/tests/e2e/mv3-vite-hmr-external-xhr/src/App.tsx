import React from 'react'

declare const __TEST_API_URL__: string

const App: React.FC = () => {
  const [ok, setOk] = React.useState(false)
  React.useEffect(() => {
    fetch(__TEST_API_URL__)
      .then((res) => {
        return res.text()
      })
      .then((text) => {
        if (text === 'ok') {
          setOk(true)
        }
      })
  }, [setOk])
  return (
    <div>
      <h1>HMR + External XHR Test</h1>
      <p>Received successful response from external XHR: {ok ? 'Yes' : 'No'}</p>
    </div>
  )
}

export default App
