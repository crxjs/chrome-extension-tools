declare module '*?script' {
  /**
   * The file name of the bundled script file
   */
  const fileName: string
  export default script
}
declare module '*?script&text' {
  /**
   * The bundled script file as a string that contains an IIFE
   */
  const script: string
  export default script
}
