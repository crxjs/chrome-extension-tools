import type { CorsOptions, Plugin } from 'vite'

const extensionOrigins = [/^chrome-extension:\/\//, /^moz-extension:\/\//]

function isExtensionOrigin(origin?: string) {
  return origin
    ? extensionOrigins.some((pattern) => pattern.test(origin))
    : false
}

function addExtensionOrigins(
  origin: CorsOptions['origin'],
): CorsOptions['origin'] {
  if (origin === true) return true
  if (typeof origin === 'function') {
    return (requestOrigin, cb) => {
      if (isExtensionOrigin(requestOrigin)) {
        cb(null as unknown as Error, true)
        return
      }

      origin(requestOrigin, cb)
    }
  }

  if (Array.isArray(origin)) return [...origin, ...extensionOrigins]
  if (origin) return [origin, ...extensionOrigins]

  return extensionOrigins
}

export function addExtensionCors(
  cors: CorsOptions | boolean | undefined,
): CorsOptions | boolean {
  if (cors === true) return true
  if (cors && typeof cors === 'object') {
    return {
      ...cors,
      origin: addExtensionOrigins(cors.origin),
    }
  }

  return { origin: extensionOrigins }
}

export function pluginExtensionCors(): Plugin {
  return {
    name: 'crx:extension-cors',
    apply: 'serve',
    config(config) {
      // Vite's dev-server CORS default was tightened in patched releases
      // (4.5.6, 5.4.12, 6.0.9+). Extension pages still need access to
      // dev-server files; WebSocket HMR tokens do not cover fetch CORS.
      config.server = {
        ...config.server,
        cors: addExtensionCors(config.server?.cors),
      }
    },
  }
}
