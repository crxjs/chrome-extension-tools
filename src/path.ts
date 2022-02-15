import path from 'path'
import { posix, win32 } from 'path'
import { normalizePath } from '@rollup/pluginutils'

const isWindows = process.platform === 'win32'

export const {
  basename,
  dirname,
  extname,
  delimiter,
  format,
  isAbsolute,
  normalize,
  parse,
  toNamespacedPath,
  sep,
} = path

export function relative(path: string, path2: string): string {
  if (isWindows) {
    return normalizePath(win32.relative(path, path2))  
  }
  return posix.relative(path, path2)
}

export function resolve(path: string, path2: string): string {
  if (isWindows) {
    return normalizePath(win32.resolve(path, path2))
  }

  return posix.resolve(path, path2)
}

export function join(...paths: string[]): string {
  if (isWindows) {
    return normalizePath(win32.join(...paths))
  }
  return posix.join(...paths)
}

