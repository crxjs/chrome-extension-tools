import type { CorsOptions, Plugin } from 'vite'
import type { ManifestV3 } from './manifest'
import { getOptions } from './plugin-optionsProvider'

const extensionOrigins = [/^chrome-extension:\/\//, /^moz-extension:\/\//]

type CorsOrigin = string | RegExp
type ExtraCorsOrigins = true | CorsOrigin[]

function isAllowedOrigin(origin: string | undefined, allowed: CorsOrigin[]) {
  return origin
    ? allowed.some((item) =>
        typeof item === 'string' ? item === origin : item.test(origin),
      )
    : false
}

function escapeRegExp(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function matchPatternToCorsOrigins(pattern: string): true | CorsOrigin[] {
  if (pattern === '<all_urls>') return true

  const match = pattern.match(/^(\*|http|https):\/\/([^/]+)\//)
  if (!match) return []

  const [, scheme, host] = match
  const schemes = scheme === '*' ? ['http', 'https'] : [scheme]

  return schemes.map((item) => {
    if (host === '*') return new RegExp(`^${item}:\\/\\/`)

    if (host.startsWith('*.')) {
      const escapedHost = escapeRegExp(host.slice(2))
      return new RegExp(`^${item}:\\/\\/([^/]+\\.)?${escapedHost}(?::\\d+)?$`)
    }

    return new RegExp(`^${item}:\\/\\/${escapeRegExp(host)}(?::\\d+)?$`)
  })
}

function getContentScriptCorsOrigins(manifest: ManifestV3): ExtraCorsOrigins {
  const origins: CorsOrigin[] = []

  for (const script of manifest.content_scripts ?? []) {
    for (const match of script.matches ?? []) {
      const result = matchPatternToCorsOrigins(match)
      if (result === true) return true
      origins.push(...result)
    }
  }

  return origins
}

function addAllowedOrigins(
  origin: CorsOptions['origin'],
  extraOrigins: ExtraCorsOrigins,
): CorsOptions['origin'] {
  if (extraOrigins === true) return true
  if (origin === true) return true

  const allowed = [...extensionOrigins, ...extraOrigins]

  if (typeof origin === 'function') {
    return (requestOrigin, cb) => {
      if (isAllowedOrigin(requestOrigin, allowed)) {
        cb(null as unknown as Error, true)
        return
      }

      origin(requestOrigin, cb)
    }
  }

  if (Array.isArray(origin)) return [...origin, ...allowed]
  if (origin) return [origin, ...allowed]

  return allowed
}

export function addExtensionCors(
  cors: CorsOptions | boolean | undefined,
  extraOrigins: ExtraCorsOrigins = [],
): CorsOptions | boolean {
  if (cors === true) return true
  if (cors && typeof cors === 'object') {
    return {
      ...cors,
      origin: addAllowedOrigins(cors.origin, extraOrigins),
    }
  }

  if (extraOrigins === true) return true

  return { origin: [...extensionOrigins, ...extraOrigins] }
}

export function pluginExtensionCors(): Plugin {
  return {
    name: 'crx:extension-cors',
    apply: 'serve',
    async config(config, env) {
      const opts = await getOptions(config)
      let extraOrigins: ExtraCorsOrigins = []

      if (opts.contentScripts?.hmr === 'native') {
        const manifest = await (typeof opts.manifest === 'function'
          ? opts.manifest(env)
          : opts.manifest)
        extraOrigins = getContentScriptCorsOrigins(manifest)
      }

      // Vite's dev-server CORS default was tightened in patched releases
      // (4.5.6, 5.4.12, 6.0.9+). Extension pages still need access to
      // dev-server files; WebSocket HMR tokens do not cover fetch CORS.
      config.server = {
        ...config.server,
        cors: addExtensionCors(config.server?.cors, extraOrigins),
      }
    },
  }
}
