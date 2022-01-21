import fs from 'fs-extra'
import glob from 'glob'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const testName = 'vite-build.test.ts'
const testType = 'mv3'

const dirname = path.dirname(fileURLToPath(import.meta.url))
const templatePath = path.join(dirname, testName)
const template = fs.readFileSync(templatePath, 'utf8')

const testsDir = path.resolve(dirname, '..', testType)
const files = glob.sync(`**/${testName}`, {
  cwd: testsDir,
  absolute: true,
})

for (const file of files) {
  if (file.includes('invalid-manifest')) continue

  fs.writeFileSync(file, template)
}

console.log('updated files', files)
