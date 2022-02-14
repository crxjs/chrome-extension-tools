import React from 'react'

const App: React.FC = () => {
  const [ok, setOk] = React.useState(false)
  React.useEffect(() => {
    fetch('http://mock-api-route.test/')
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
      <p>
        Received successful response from external XHR:{' '}
        {ok ? 'Yes' : 'No'}
      </p>
    </div>
  )
}

export default App
