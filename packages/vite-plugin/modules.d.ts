/// <reference types="vite/client" />

declare module 'client/*' {
  const code: string
  export default code
}

declare module 'http://localhost:%PORT%/*'
declare module '*/%PATH%'

declare module 'connect-injector' {
  import { ServerResponse } from 'http'
  import type { Connect } from 'vite'

  export default function (
    when: (req: Connect.IncomingMessage, res: ServerResponse) => boolean,
    converter: (
      content: Buffer | string,
      req: Connect.IncomingMessage,
      res: ServerResponse,
      callback: (error: unknown, data?: Buffer | string) => void,
    ) => void,
  ): Connect.HandleFunction
}
