declare module '*?script' {
  /**
   * Script format is ESM. Loaded via dynamic import script. Supports HMR. Use
   * with the Chrome Scripting API inside of the background service worker or an
   * extension page.
   *
   * Exports the file name of the ouptut script file.
   *
   * If imported inside a content script, RPCE will include the file name in
   * `web_accessible_resources`.
   */
  const fileName: string
  export default fileName
}

declare module '*?script&iife' {
  /**
   * Script format is IIFE. Use for content scripts with opaque origins.
   *
   * Exports the file name of the output script file.
   *
   * If imported inside a content script, RPCE will include the file name in
   * `web_accessible_resources`.
   */
  const fileName: string
  export default fileName
}

declare module '*?script&module' {
  /**
   * Script format is ESM. No loader and no HMR. Import into a content script to
   * inject via script tag into the page main world execution environment.
   *
   * Exports the file name of the output script file.
   *
   * If imported inside a content script, RPCE will include the file name in
   * `web_accessible_resources`.
   */
  const fileName: string
  export default fileName
}
