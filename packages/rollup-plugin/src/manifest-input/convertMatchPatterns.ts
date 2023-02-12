export const convertMatchPatterns = (m: string): string => {
  // Use URL to parse match pattern
  // URL must have valid url scheme
  const [scheme, rest] = m.split('://')

  // URL must have valid port
  const [a, port, b] = rest.split(/(:\*)/)
  const isWildPort = port === ':*'
  const frag = isWildPort ? `${a}:3333${b}` : rest

  // match patterns can only define origin
  const { origin } = new URL(`http://${frag}`)
  const [, base] = origin.split('://')

  // put port back
  const [x, y] = base.split(':3333')
  const final = isWildPort ? [x, port, y].join('') : base

  // URL escapes asterisks
  // Need to unescape them
  return unescape(`${scheme}://${final}/*`)
}
