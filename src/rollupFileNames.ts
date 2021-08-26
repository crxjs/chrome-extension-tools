/* eslint-disable no-prototype-builtins */
import { createHash as cryptoCreateHash, Hash } from 'crypto'
import { basename } from 'path'
import { NormalizedOutputOptions } from 'rollup'

export const createHash = (): Hash => cryptoCreateHash('sha256')

export function extname(path: string): string {
  const match = /\.[^.]+$/.exec(basename(path)!)
  if (!match) return ''
  return match[0]
}

export const absolutePath = /^(?:\/|(?:[A-Za-z]:)?[\\|/])/
export function isAbsolute(path: string): boolean {
  return absolutePath.test(path)
}

export function isPathFragment(name: string): boolean {
  // starting with "/", "./", "../", "C:/"
  return (
    name[0] === '/' ||
    (name[0] === '.' && (name[1] === '/' || name[1] === '.')) ||
    isAbsolute(name)
  )
}

export function renderNamePattern(
  pattern: string,
  patternName: string,
  replacements: { [name: string]: () => string },
): string {
  return pattern.replace(/\[(\w+)\]/g, (_match, type) => {
    if (!replacements.hasOwnProperty(type)) {
      throw new Error(
        `"[${type}]" is not a valid placeholder in "${patternName}" pattern.`,
      )
    }
    const replacement = replacements[type]()
    if (isPathFragment(replacement))
      throw new Error(
        `Invalid substitution "${replacement}" for placeholder "[${type}]" in "${patternName}" pattern, can be neither absolute nor relative path.`,
      )
    return replacement
  })
}

export function sanitizeFileName(name: string): string {
  const match = /^[a-z]:/i.exec(name)
  const driveLetter = match ? match[0] : ''

  // A `:` is only allowed as part of a windows drive letter (ex: C:\foo)
  // Otherwise, avoid them because they can refer to NTFS alternate data streams.
  return (
    driveLetter +
    name.substr(driveLetter.length).replace(/[\0?*:]/g, '_')
  )
}

export function generateAssetFileName(
  name: string | undefined,
  source: string | Uint8Array,
  outputOptions: Pick<NormalizedOutputOptions, 'assetFileNames'>,
): string {
  const emittedName = sanitizeFileName(name || 'asset')
  return renderNamePattern(
    typeof outputOptions.assetFileNames === 'function'
      ? outputOptions.assetFileNames({
          name,
          source,
          type: 'asset',
        })
      : outputOptions.assetFileNames,
    'output.assetFileNames',
    {
      ext: () => extname(emittedName).substr(1),
      extname: () => extname(emittedName),
      hash() {
        const hash = createHash()
        hash.update(emittedName)
        hash.update(':')
        hash.update(source)
        return hash.digest('hex').substr(0, 8)
      },
      name: () =>
        emittedName.substr(
          0,
          emittedName.length - extname(emittedName).length,
        ),
    },
  )
}
