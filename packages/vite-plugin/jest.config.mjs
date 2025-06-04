import fs from 'fs-extra'
import path from 'pathe'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const esModules = ['read-pkg'].map((x) => `(${x})`).join('|')

const clientDir = path.join(__dirname, 'src', 'client')
function getClientFiles() {
  const clientFiles = fs
    .readdirSync(clientDir, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .flatMap((dirent) => {
      const type = dirent.name
      const dir = path.join(clientDir, dirent.name)
      return fs
        .readdirSync(dir, { withFileTypes: true })
        .filter((dirent) => dirent.isFile())
        .map((dirent) => dirent.name)
        .map((f) => path.posix.join(type, f))
    })

  return clientFiles
}

const moduleNameMaps = Object.fromEntries(
  getClientFiles().map((filename) => {
    const { dir, name } = path.posix.parse(filename)
    return [
      `client/${filename}\\?client`,
      `<rootDir>/tests/artifacts/${path.posix.join(dir, name + '.js')}`,
    ]
  }),
)

export default {
  // For PNPM users, need to add '.*' to get the last instance of the ignored module
  transformIgnorePatterns: [`node_modules/(?!.*${esModules})`],
  globalSetup: './tests/jest.globalSetup.ts',
  moduleNameMapper: {
    // aliases
    '^src(.+)$': '<rootDir>/src/node$1',
    '^tests(.+)$': '<rootDir>/tests$1',
    // client file imports
    ...moduleNameMaps,
  },
  setupFilesAfterEnv: ['./tests/jest.setup.ts'],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/playground/',
    '/dist/',
    '/tests/templates/',
  ],
  transform: {
    '\\.[tj]sx?$': 'esbuild-runner/jest',
  },
  watchPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/tests/.+?dist',
    '<rootDir>/tests/templates',
  ],
}
