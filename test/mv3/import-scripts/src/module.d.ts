declare module '*?script' {
  /**
   * The file name of the bundled script file.
   *
   * Default script format is IIFE.
   *
   * If imported inside a content script, RPCE will include the file name in `web_accessible_resources`.
   */
  const fileName: string
  export default script
}

declare module '*?script&esm' {
  /**
   * The file name of the bundled script file.
   *
   * Script format is ESM.
   *
   * If imported inside a content script, RPCE will include the file name in `web_accessible_resources`.
   */
  const fileName: string
  export default script
}
