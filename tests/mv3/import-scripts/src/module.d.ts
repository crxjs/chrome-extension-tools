declare module '*?script' {
  /**
   * The file name of the bundled script file.
   *
   * Default script format is ESM, with a loader script.
   *
   * If imported inside a content script, RPCE will include the file name in
   * `web_accessible_resources`.
   */
  const fileName: string
  export default fileName
}

declare module '*?script&iife' {
  /**
   * The file name of the bundled script file.
   *
   * Script format is IIFE.
   *
   * If imported inside a content script, RPCE will include the file name in
   * `web_accessible_resources`.
   */
  const fileName: string
  export default fileName
}

declare module '*?script&main' {
  /**
   * The file name of the bundled script file.
   *
   * Script format is ESM, with no loader script.
   *
   * If imported inside a content script, RPCE will include the file name in
   * `web_accessible_resources`.
   */
  const fileName: string
  export default fileName
}
