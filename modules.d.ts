/// <reference types="vite/client" />

declare module '*?client' {
  const code: string
  export default code
}

declare module 'http://localhost:%PORT%/*'
declare module '*/%PATH%'
