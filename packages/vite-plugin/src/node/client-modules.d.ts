// Rollup plugin bundleClientCode transforms these imports to strings
declare module 'client/iife/content-dev-loader.ts' {
  const content: string
  export default content
}

declare module 'client/iife/content-pro-loader.ts' {
  const content: string
  export default content
}

declare module 'client/iife/content-dev-main-loader.ts' {
  const content: string
  export default content
}

declare module 'client/iife/content-pro-main-loader.ts' {
  const content: string
  export default content
}

declare module 'client/es/hmr-client-worker.ts' {
  const content: string
  export default content
}

declare module 'client/es/hmr-content-port.ts' {
  const content: string
  export default content
}

declare module 'client/es/page-inline-script-loader.ts' {
  const content: string
  export default content
}

declare module 'client/es/loading-page-script.ts' {
  const content: string
  export default content
}
