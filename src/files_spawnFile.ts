import { cosmiconfig } from 'cosmiconfig'
import { readFile, readJSON } from 'fs-extra'
import { relative } from './path'
import { posix, sep } from 'path'
import { from, Observable, of } from 'rxjs'
import { spawn } from 'xstate'
import {
  AssetEvent,
  assetMachine,
  model,
} from './files-asset.machine'
import { scriptMachine } from './files-script.machine'
import { htmlParser } from './files_htmlParser'
import { manifestParser } from './files_manifestParser'
import { Asset, BaseAsset, Manifest, Script } from './types'
import { isScript } from './files.sharedEvents'

const manifestExplorer = cosmiconfig('manifest', {
  cache: false,
  loaders: {
    '.ts': (filePath: string) => {
      require('esbuild-runner/register')
      const result = require(filePath)

      return result.default ?? result
    },
  },
})

export function spawnFile(
  file: BaseAsset | Script,
  root: string,
) {
  if (isScript(file))
    return spawn(scriptMachine.withContext(file), file.id)

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
    of(model.events.PARSED())
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
      .withContext(file),
    { name: file.id },
  )
}

/** Opposite of normalizePath. Transform posix to use system path separator. */
const getSystemPath = (id: string) =>
  id.split(posix.sep).join(sep)

function stringLoader({ id }: Asset) {
  return from(
    readFile(getSystemPath(id), 'utf8')
      .then((source) =>
        model.events.LOADED({
          id,
          source,
        }),
      )
      .catch(model.events.ERROR),
  )
}

function rawLoader({ id }: Asset) {
  return from(
    readFile(getSystemPath(id))
      .then((source) =>
        model.events.LOADED({
          id,
          source,
        }),
      )
      .catch(model.events.ERROR),
  )
}

function jsonLoader({ id }: Asset) {
  return from(
    readJSON(getSystemPath(id))
      .then((source) =>
        model.events.LOADED({
          id,
          source,
        }),
      )
      .catch(model.events.ERROR),
  )
}

function manifestLoader({ id }: Asset) {
  return from(
    manifestExplorer
      .load(getSystemPath(id))
      .then((result) => {
        if (result === null)
          throw new Error(`Unable to load manifest at ${id}`)
        const { config, isEmpty } = result
        if (isEmpty)
          throw new Error(
            `Manifest appears to be empty at ${id}`,
          )
        return model.events.LOADED({
          id,
          source: config as Manifest,
        })
      })
      .catch(model.events.ERROR),
  )
}
