import fs from 'fs'
import { dirname } from 'path'

const realWriteFile = fs.writeFile

const log = label => x => {
  console.log(label, x)
  return x
}

export const extendWriteFile = (
  map = log('writeFile path:'),
) => {
  fs.writeFile = (filePath, contents, callback) => {
    const mapped = map(filePath)

    mkdirpath(mapped)
    return realWriteFile(mapped, contents, callback)
  }
}

function mkdirpath(path) {
  const dir = dirname(path)
  try {
    fs.readdirSync(dir)
  } catch (err) {
    mkdirpath(dir)
    try {
      fs.mkdirSync(dir)
    } catch (err2) {
      if (err2.code !== 'EEXIST') {
        throw err2
      }
    }
  }
}
