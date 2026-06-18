#!/usr/bin/env node
import { spawn } from 'node:child_process'
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const DEFAULT_VERSIONS = ['3', '6', '7', '8']
const DEFAULT_MODES = ['compat', 'e2e']
const BASE_VITE_VERSION = '3'
const PNPM = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm'

const packageDir = path.resolve(fileURLToPath(new URL('..', import.meta.url)))
const rootDir = path.resolve(packageDir, '../..')
const packageJsonPath = path.join(packageDir, 'package.json')
const lockfilePath = path.join(rootDir, 'pnpm-lock.yaml')

function parseList(value) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

function readOptionValue(args, index, optionName) {
  const value = args[index + 1]
  if (!value || value.startsWith('--')) {
    throw new Error(`Missing value for ${optionName}`)
  }
  return value
}

function parseArgs(argv) {
  const args = argv[0] === '--' ? argv.slice(1) : argv
  const separatorIndex = args.indexOf('--')
  const scriptArgs =
    separatorIndex === -1 ? args : args.slice(0, separatorIndex)
  const vitestArgs =
    separatorIndex === -1 ? [] : args.slice(separatorIndex + 1)

  const options = {
    build: true,
    install: true,
    modes: process.env.VITE_MATRIX_MODES
      ? parseList(process.env.VITE_MATRIX_MODES)
      : undefined,
    versions: process.env.VITE_MATRIX_VERSIONS
      ? parseList(process.env.VITE_MATRIX_VERSIONS)
      : undefined,
    vitestArgs,
  }

  const positionalVersions = []

  for (let index = 0; index < scriptArgs.length; index += 1) {
    const arg = scriptArgs[index]

    if (arg === '--help' || arg === '-h') {
      options.help = true
    } else if (arg === '--skip-build' || arg === '--no-build') {
      options.build = false
    } else if (arg === '--skip-install' || arg === '--no-install') {
      options.install = false
    } else if (
      arg === '--vite' ||
      arg === '--vite-version' ||
      arg === '--versions'
    ) {
      const value = readOptionValue(scriptArgs, index, arg)
      options.versions = parseList(value)
      index += 1
    } else if (arg.startsWith('--vite=')) {
      options.versions = parseList(arg.slice('--vite='.length))
    } else if (arg.startsWith('--vite-version=')) {
      options.versions = parseList(arg.slice('--vite-version='.length))
    } else if (arg.startsWith('--versions=')) {
      options.versions = parseList(arg.slice('--versions='.length))
    } else if (arg === '--mode' || arg === '--modes') {
      const value = readOptionValue(scriptArgs, index, arg)
      options.modes = parseList(value)
      index += 1
    } else if (arg.startsWith('--mode=')) {
      options.modes = parseList(arg.slice('--mode='.length))
    } else if (arg.startsWith('--modes=')) {
      options.modes = parseList(arg.slice('--modes='.length))
    } else if (arg.startsWith('-')) {
      throw new Error(`Unknown option: ${arg}`)
    } else {
      positionalVersions.push(arg)
    }
  }

  if (positionalVersions.length > 0) {
    options.versions = positionalVersions
  }

  options.versions = options.versions ?? DEFAULT_VERSIONS
  options.modes = options.modes ?? DEFAULT_MODES

  return options
}

function normalizeVersions(versions) {
  const normalized = versions.flatMap((version) =>
    version === 'all'
      ? DEFAULT_VERSIONS
      : [version.replace(/^vite@/, '').replace(/^v(?=\d)/i, '')],
  )

  return [...new Set(normalized)]
}

function normalizeModes(modes) {
  const normalized = modes.flatMap((mode) => {
    if (mode === 'all') return DEFAULT_MODES
    return [mode]
  })

  for (const mode of normalized) {
    if (!DEFAULT_MODES.includes(mode)) {
      throw new Error(
        `Unsupported mode "${mode}". Expected one of: ${DEFAULT_MODES.join(
          ', ',
        )}`,
      )
    }
  }

  return [...new Set(normalized)]
}

function getMajorVersion(version) {
  return version.match(/\d+/)?.[0]
}

function printHelp() {
  console.log(`Run the Vite plugin compatibility matrix locally.

Usage:
  pnpm test:vite-matrix
  pnpm test:vite-matrix -- --mode e2e --vite 8
  pnpm test:vite-matrix -- --mode compat,e2e --vite 6,7
  pnpm test:vite-matrix -- 8

Options:
  --vite, --versions <list>  Vite versions to test. Default: ${DEFAULT_VERSIONS.join(
    ',',
  )}
  --mode, --modes <list>     Test modes to run: compat, e2e, or all. Default: ${DEFAULT_MODES.join(
    ',',
  )}
  --skip-install            Skip the initial pnpm install step.
  --skip-build              Skip building the plugin before switching Vite.
  --help                    Show this help.

Environment:
  VITE_MATRIX_VERSIONS      Default Vite versions when --vite is omitted.
  VITE_MATRIX_MODES         Default modes when --mode is omitted.

Extra Vitest args can be passed after a second "--":
  pnpm test:vite-matrix -- --vite 8 --mode e2e -- --update
`)
}

function formatCommand(command, args) {
  return [command, ...args].join(' ')
}

function run(command, args, options = {}) {
  console.log(`\n[vite-matrix] ${formatCommand(command, args)}`)

  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd ?? packageDir,
      env: process.env,
      shell: false,
      stdio: 'inherit',
    })

    child.on('error', reject)
    child.on('close', (code, signal) => {
      if (code === 0) {
        resolve()
      } else {
        reject(
          new Error(
            signal
              ? `${formatCommand(command, args)} exited with signal ${signal}`
              : `${formatCommand(command, args)} exited with code ${code}`,
          ),
        )
      }
    })
  })
}

function capture(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd ?? packageDir,
      env: process.env,
      shell: false,
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    let stdout = ''
    let stderr = ''

    child.stdout.on('data', (chunk) => {
      stdout += chunk
    })

    child.stderr.on('data', (chunk) => {
      stderr += chunk
    })

    child.on('error', reject)
    child.on('close', (code, signal) => {
      if (code === 0) {
        resolve(stdout.trim())
      } else {
        reject(
          new Error(
            signal
              ? `${formatCommand(command, args)} exited with signal ${signal}`
              : `${formatCommand(command, args)} exited with code ${code}\n${stderr}`,
          ),
        )
      }
    })
  })
}

async function restoreFiles(backups) {
  await writeFile(packageJsonPath, backups.packageJson)
  await writeFile(lockfilePath, backups.lockfile)
}

function assertBaseViteVersion(packageJsonBuffer) {
  const packageJson = JSON.parse(packageJsonBuffer.toString('utf8'))
  const viteSpecifier = packageJson.devDependencies?.vite
  const majorVersion = viteSpecifier?.match(/\d+/)?.[0]

  if (majorVersion !== BASE_VITE_VERSION) {
    throw new Error(
      `Expected packages/vite-plugin to start from Vite ${BASE_VITE_VERSION}, but package.json has "${viteSpecifier}". Restore the base dependency before running the matrix.`,
    )
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2))

  if (options.help) {
    printHelp()
    return
  }

  const versions = normalizeVersions(options.versions)
  const modes = normalizeModes(options.modes)
  const backups = {
    lockfile: await readFile(lockfilePath),
    packageJson: await readFile(packageJsonPath),
  }

  assertBaseViteVersion(backups.packageJson)

  let switchedViteVersion = false
  let originalError

  console.log(
    `[vite-matrix] modes=${modes.join(',')} vite=${versions.join(',')}`,
  )

  try {
    if (options.install) {
      await run(
        PNPM,
        ['install', '--filter', 'vite-plugin', '--frozen-lockfile'],
        {
          cwd: rootDir,
        },
      )
    }

    if (options.build) {
      await run(PNPM, ['build'])
    }

    for (const version of versions) {
      const majorVersion = getMajorVersion(version)

      if (majorVersion !== BASE_VITE_VERSION) {
        switchedViteVersion = true
        await run(PNPM, [
          'add',
          '-D',
          `vite@${version}`,
          '--ignore-scripts',
        ])
      }

      if (majorVersion === '8') {
        await run(PNPM, [
          'add',
          '-D',
          '@vitejs/plugin-react@5.2.0',
          '--ignore-scripts',
        ])
      }

      const viteVersion = await capture(PNPM, ['exec', 'vite', '--version'])
      console.log(`[vite-matrix] Testing with ${viteVersion}`)

      for (const mode of modes) {
        const vitestArgs = ['exec', 'vitest', '--run', '--mode', mode]

        if (majorVersion === '8') {
          vitestArgs.push('--threads', 'false')
        }

        vitestArgs.push(...options.vitestArgs)

        await run(PNPM, vitestArgs)
      }
    }
  } catch (error) {
    originalError = error
  } finally {
    if (switchedViteVersion) {
      console.log('\n[vite-matrix] Restoring package.json and pnpm-lock.yaml')
      await restoreFiles(backups)

      console.log('[vite-matrix] Restoring installed Vite dependency')
      await run(PNPM, [
        'install',
        '--filter',
        'vite-plugin',
        '--ignore-scripts',
        '--frozen-lockfile',
      ])
    }
  }

  if (originalError) {
    throw originalError
  }
}

main().catch((error) => {
  console.error(`\n[vite-matrix] ${error.message}`)
  process.exitCode = 1
})
