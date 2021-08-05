const fs = require('fs-extra')
const path = require('path')

console.clear()

const rootDir = path.resolve(
  __dirname,
  '__fixtures__',
  'extensions',
)

Promise.all(
  fs
    .readdirSync(rootDir, { withFileTypes: true })
    .filter(
      (dir) => dir.isDirectory() && dir.name.startsWith('mv3'),
    )
    .map((dir) => path.join(rootDir, dir.name))
    .map((dir) => {
      const m1 = path.resolve(dir, 'manifest.json')
      const m2 = path.resolve(dir, 'src', 'manifest.json')
      const result = fs.existsSync(m1)
        ? m1
        : fs.existsSync(m2)
        ? m2
        : null

      if (!result)
        throw new Error(`No manifest.json found in ${dir}`)

      return result
    })
    .map(async (manifestPath) => {
      const manifest = await fs.readJSON(manifestPath)
      manifest.manifest_version = 2
      await fs.writeJSON(manifestPath, manifest)
    }),
).catch(console.error)
