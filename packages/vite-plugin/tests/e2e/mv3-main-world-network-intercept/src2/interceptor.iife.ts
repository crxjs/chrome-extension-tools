const interceptorMarker = 'crx-main-world-iife-updated'

declare global {
  interface Window {
    __crxPatchInstalledBy?: string
    __crxFetchInterceptedBy?: string
    __crxXhrInterceptedBy?: string
  }
}

window.__crxPatchInstalledBy = interceptorMarker

const nativeFetch = window.fetch.bind(window)
window.fetch = ((...args: Parameters<typeof window.fetch>) => {
  window.__crxFetchInterceptedBy = interceptorMarker
  return nativeFetch(...args)
}) as typeof window.fetch

type XhrOpen = typeof window.XMLHttpRequest.prototype.open
type XhrOpenTwoArg = (method: string, url: string | URL) => void
type XhrOpenFull = (
  method: string,
  url: string | URL,
  async: boolean,
  username?: string | null,
  password?: string | null,
) => void

const nativeXhrOpen = window.XMLHttpRequest.prototype.open
function open(this: XMLHttpRequest, method: string, url: string | URL): void
function open(
  this: XMLHttpRequest,
  method: string,
  url: string | URL,
  async: boolean,
  username?: string | null,
  password?: string | null,
): void
function open(
  this: XMLHttpRequest,
  method: string,
  url: string | URL,
  async?: boolean,
  username?: string | null,
  password?: string | null,
) {
  window.__crxXhrInterceptedBy = interceptorMarker
  if (typeof async === 'undefined') {
    return (nativeXhrOpen as XhrOpenTwoArg).call(this, method, url)
  }
  return (nativeXhrOpen as XhrOpenFull).call(
    this,
    method,
    url,
    async,
    username,
    password,
  )
}

window.XMLHttpRequest.prototype.open = open as XhrOpen

export {}
