/// <reference types="vite/client" />

interface ImportMetaEnv
  extends Readonly<Record<string, string>> {
  readonly VITE_APP_TITLE: string
  // more env variables...
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare module '*.html' {
  const src: string
  export default src
}

declare module '*?script' {
  const src: string
  export default src
}
