import { resolve } from 'path'

export const getExtPath = (path: string) =>
  resolve(__dirname, 'extensions', path)
