declare module '*?script' {
  /**
   * The file name of the bundled script file.
   * Default script format is IIFE
   */
  const fileName: string
  export default script
}

declare module '*?script&esm' {
  /**
   * The file name of the bundled script file
   * Script format will be ESM, and if imported
   * inside a manifest content script, the output script
   * will be added to the manifest under `web_accessible_resources`,
   * with the same `matches` array as the importing
   * content script.
   */
  const fileName: string
  export default script
}
