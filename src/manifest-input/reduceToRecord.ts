import { relative } from 'path'

type InputRecord = Record<string, string>

export function reduceToRecord(srcDir: string) {
  return function(r: InputRecord, f: string): InputRecord {
    const name = relative(srcDir, f)
      .split('.')
      .slice(0, -1)
      .join('.')

    return { ...r, [name]: f }
  }
}
