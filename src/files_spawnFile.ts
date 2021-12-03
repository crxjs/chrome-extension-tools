import { cosmiconfig } from 'cosmiconfig'
import { readFile, readJSON } from 'fs-extra'
import { posix, sep } from 'path'
import { from, Observable, of } from 'rxjs'
import { spawn } from 'xstate'
import {
  AssetEvent,
  assetMachine,
  model,
} from './files-asset.machine'
import { scriptMachine } from './files-script.machine'
import { isScript } from './files.sharedEvents'
import { htmlParser } from './files_htmlParser'
import { manifestParser } from './files_manifestParser'
import { isUndefined } from './helpers'
import { parse, relative } from './path'
import { Asset, BaseAsset, Script } from './types'

export function spawnFile(
  file: BaseAsset | Script,
  root: string,
) {
  if (isScript(file))
    return spawn(scriptMachine.withContext(file), {
      name: file.id,
    })

  let loader: (context: Asset) => Observable<AssetEvent>
  if (file.fileType === 'CSS' || file.fileType === 'HTML') {
    loader = stringLoader
  } else if (file.fileType === 'JSON') {
    loader = jsonLoader
  } else if (file.fileType === 'MANIFEST') {
    loader = manifestLoader
  } else {
    loader = rawLoader
  }

  let parser: (context: Asset) => Observable<AssetEvent> = () =>
    of(model.events.PARSED([]))
  if (file.fileType === 'HTML') {
    parser = htmlParser(root)
  } else if (file.fileType === 'MANIFEST') {
    parser = manifestParser(root)
  }

  const { fileName } = file
  file.fileName = fileName.startsWith(root)
    ? relative(root, fileName)
    : fileName

  return spawn(
    assetMachine
      .withConfig({
        services: {
          loader,
          parser,
        },
      })
      .withContext(file as Asset),
    { name: file.id },
  )
}

/** Opposite of normalizePath. Transform posix to use system path separator. */
const getSystemPath = (id: string) =>
  id.split(posix.sep).join(sep)

function stringLoader({ id }: Asset) {
  return from(
    readFile(getSystemPath(id), 'utf8')
      .then((source) => {
        if (isUndefined(source))
          throw new TypeError(`Source is undefined for ${id}`)
        return model.events.LOADED({ source })
      })
      .catch(model.events.ERROR),
  )
}

function rawLoader({ id }: Asset) {
  return from(
    readFile(getSystemPath(id))
      .then((source) => {
        if (isUndefined(source))
          throw new TypeError(`Source is undefined for ${id}`)
        return model.events.LOADED({ source })
      })
      .catch(model.events.ERROR),
  )
}

function jsonLoader({ id }: Asset) {
  return from(
    readJSON(getSystemPath(id))
      .then((source) => {
        if (isUndefined(source))
          throw new TypeError(`Source is undefined for ${id}`)
        return model.events.LOADED({ source })
      })
      .catch(model.events.ERROR),
  )
}

const manifestExplorer = cosmiconfig('manifest', {
  cache: false,
  loaders: {
    '.ts': (filePath: string) => {
      require('esbuild-runner/register')
      const result = require(filePath)

      return result.default ?? result
    },
  },
  searchPlaces: [
    'manifest.json',
    'manifest.ts',
    'manifest.js',
    'manifest.yaml',
    'manifest.yml',
  ],
})

function manifestLoader({ id }: Asset) {
  const { ext } = parse(id)
  const loadPromise = ext
    ? manifestExplorer.load(getSystemPath(id))
    : manifestExplorer.search(id)
  return from(
    loadPromise
      .then((result) => {
        if (result === null)
          throw new Error(`Unable to load manifest at ${id}`)
        const { config: source, isEmpty } = result
        if (isEmpty)
          throw new Error(
            `Manifest appears to be empty at ${id}`,
          )
        return model.events.LOADED({ source })
      })
      .catch(model.events.ERROR),
  )
}
