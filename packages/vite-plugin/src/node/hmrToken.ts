import { randomBytes } from 'crypto'
import type { ResolvedConfigWithHMRToken } from './types'

const crxHmrTokens = new WeakMap<ResolvedConfigWithHMRToken, string>()

export function getCrxHmrToken(config: ResolvedConfigWithHMRToken) {
  if (config.webSocketToken) return config.webSocketToken

  let token = crxHmrTokens.get(config)
  if (!token) {
    token = randomBytes(16).toString('hex')
    crxHmrTokens.set(config, token)
  }

  return token
}
