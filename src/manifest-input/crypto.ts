import { createHash as cryptoCreateHash } from 'crypto'

export function hashCode(code: string, id: string) {
  const hash = cryptoCreateHash('sha256')
  hash.update(code)
  hash.update(id)
  return hash.digest('hex').substr(0, 8)
}
