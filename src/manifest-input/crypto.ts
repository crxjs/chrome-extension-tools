import { createHash as cryptoCreateHash } from 'crypto'

export function hashCode(code: string) {
  const hash = cryptoCreateHash('sha256')
  hash.update(code)
  return hash.digest('hex').substr(0, 8)
}
