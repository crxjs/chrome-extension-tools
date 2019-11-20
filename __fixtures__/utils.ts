import { resolve } from 'path'

export const getExtPath = (path: string) =>
  resolve(__dirname, 'extensions', path)

/**  Make relative to project root */
export const getRelative = (p: string) =>
  p.replace(process.cwd() + '/', '')
