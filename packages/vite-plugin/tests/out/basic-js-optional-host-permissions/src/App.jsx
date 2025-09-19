import React from 'react'

const App = () => {
  return (
    <div>
      <h1>Popup Page</h1>
      <p>If you are seeing this, React is working!</p>
      <button
        onClick={() => {
          chrome.permissions.request(
            {
              permissions: ['tabs'],
              origins: ['https://www.google.com/'],
            },
            (granted) => {
              // The callback argument will be true if the user granted the permissions.
              if (granted) {
                console.log('Permissions granted')
                chrome.tabs.create({
                  url: 'https://www.example.com/',
                  active: true,
                })
              } else {
                console.log('Permissions denied')
              }
            },
          )
        }}
      >
        Click me to request permissions and open new tab
      </button>
    </div>
  )
}

export default App
