import { execFileSync } from 'node:child_process'
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const packageDir = fileURLToPath(new URL('..', import.meta.url))
const manifest = JSON.parse(readFileSync(path.join(packageDir, 'package.json')))
if (manifest.devDependencies['vitest-environment-web-ext']?.startsWith('github:')) {
  // Vite matrix installs use --ignore-scripts. Retain the built distribution
  // instead of allowing pnpm to refetch an unprepared Git dependency.
  const target = 'tests/.vite/web-ext-package'
  mkdirSync(path.join(packageDir, target), { recursive: true })
  const source = `${target}/source`
  rmSync(path.join(packageDir, source), { recursive: true, force: true })
  cpSync(path.join(packageDir, 'node_modules/vitest-environment-web-ext'), path.join(packageDir, source), {
    recursive: true,
    dereference: true,
    filter: (file) => path.basename(file) !== 'node_modules',
  })
  const packageFile = path.join(packageDir, source, 'package.json')
  const packedManifest = JSON.parse(readFileSync(packageFile))
  // The installed package has no build sources. Pack its existing distribution
  // without lifecycle hooks, including npm versions that still run prepare.
  delete packedManifest.scripts
  writeFileSync(packageFile, JSON.stringify(packedManifest, null, 2))
  const options = {
    cwd: packageDir,
    // Arguments are fixed relative paths, also when cmd.exe is needed on Windows.
    shell: process.platform === 'win32',
  }
  const result = execFileSync(
    process.platform === 'win32' ? 'npm.cmd' : 'npm',
    ['pack', `./${source}`, '--ignore-scripts', '--pack-destination', target, '--json'],
    { ...options, encoding: 'utf8' },
  )
  const [{ filename }] = JSON.parse(result)
  execFileSync(
    process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm',
    ['add', '-D', `./${target}/${filename}`, '--ignore-scripts'],
    { ...options, stdio: 'inherit' },
  )
}
