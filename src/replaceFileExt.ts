import { isUndefined } from 'lodash'
import { join, parse } from 'path'

export const replaceFileExt = (
  fileName: string | undefined,
  fileExt: string,
) => {
  if (isUndefined(fileName)) return undefined
  const { dir, name } = parse(fileName)
  return join(dir, `${name}.${fileExt}`)
}
