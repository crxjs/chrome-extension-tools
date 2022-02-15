import path from 'path'
import { fileURLToPath } from 'url'
import _debug from 'debug'
import fs from 'fs-extra'

const debug = _debug('templates')

const excluded = ['invalid-manifest']
const dirname = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

const templates = [
  'vite.config.ts',
  // 'build.test.ts',
  // 'serve.test.ts',
].map((name) => {
  const templatePath = path.join(dirname, 'templates', name)
  const template = fs.readFileSync(templatePath, 'utf8')
  return [name, template]
})

const testDir = path.join(dirname, 'mv3')
const testDirs = fs
  .readdirSync(testDir, { withFileTypes: true })
  .filter((dirent) => dirent.isDirectory())
  .map((dirent) => dirent.name)
for (const dir of testDirs) {
  if (excluded.some((x) => dir.includes(x))) continue

  for (const [name, template] of templates) {
    const filePath = path.join(testDir, dir, name)
    fs.writeFileSync(filePath, template)
    debug('created %s', dir, name)
  }
}

debug('created %d files', templates.length * testDirs.length)
