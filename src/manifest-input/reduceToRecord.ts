import { relative } from 'path'
import { PluginContext } from 'rollup'

type InputRecord = Record<string, string>

export function reduceToRecord(srcDir: string | null) {
  if (srcDir === null || typeof srcDir === 'undefined') {
    // This would be a config error, so should throw
    throw new TypeError('srcDir is null or undefined')
  }

  return function(
    this: PluginContext,
    inputRecord: InputRecord,
    filename: string,
  ): InputRecord {
    const name = relative(srcDir, filename)
      .split('.')
      .slice(0, -1)
      .join('.')

    if (name in inputRecord) {
      this.error(
        `Script files with different extensions should not share names:\n\n"${filename}"\nwill overwrite\n"${inputRecord[name]}"`,
      )
    }

    return { ...inputRecord, [name]: filename }
  }
}
