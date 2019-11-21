import { relative } from 'path'

type InputRecord = Record<string, string>

export function reduceToRecord(srcDir: string | null) {
  if (srcDir === null) {
    throw new TypeError('options.srcDir is not initialized')
  }
  
  return function(r: InputRecord, f: string): InputRecord {
    const name = relative(srcDir, f)
      .split('.')
      .slice(0, -1)
      .join('.')

    if (name in r) {
      throw new Error(`Script files with different extensions should not share names:\n\n"${f}"\nvs\n"${r[name]}"`)
    }

    return { ...r, [name]: f }
  }
}
