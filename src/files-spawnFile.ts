import { readFile, readJSON } from 'fs-extra'
import { join, relative, resolve } from 'path'
import { from, Observable, of } from 'rxjs'
import { spawn } from 'xstate'
import {
  AssetEvent,
  assetMachine,
  model,
} from './files-asset.machine'
import { parseHtml } from './files-parseHtml'
import { parseManifest } from './files-parseManifest'
import { scriptMachine } from './files-script.machine'
import {
  Asset,
  BaseAsset,
  FileType,
  Manifest,
  Script,
} from './types'
import { isScript } from './xstate-models'

export function spawnFile(
  file: BaseAsset | Script,
  root: string,
) {
  if (isScript(file)) return spawn(scriptMachine)

  let loader: (context: Asset) => Observable<AssetEvent>
  if (file.fileType === 'CSS' || file.fileType === 'HTML') {
    loader = stringLoader
  } else if (
    file.fileType === 'JSON' ||
    file.fileType === 'MANIFEST'
  ) {
    loader = jsonLoader
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

  return spawn(
    assetMachine
      .withConfig({
        services: {
          loader,
          parser,
        },
      })
      .withContext(file),
  )
}

function manifestParser(
  root: string,
): (context: Asset) => Observable<AssetEvent> {
  return ({ source }) => {
    const result = Object.entries(
      parseManifest(source as Manifest, root),
    ) as [FileType, string[]][]

    const files = result.flatMap(([fileType, fileNames]) =>
      fileNames.map((fileName) => ({
        fileType,
        fileName,
        id: join(root, fileName),
      })),
    )

    return from(files.map(model.events.ADD_FILE))
  }
}

function htmlParser(
  root: string,
): (context: Asset) => Observable<AssetEvent> {
  return ({ id: htmlId, source }) => {
    const result = Object.entries(
      parseHtml(source as string),
    ) as [FileType, string[]][]

    const files = result.flatMap(([fileType, fileNames]) =>
      fileNames.map((htmlFileName): Script | BaseAsset => {
        const id = resolve(htmlId, htmlFileName)
        const fileName = relative(root, id)

        return {
          fileType,
          id,
          fileName,
        }
      }),
    )

    return from(files.map(model.events.ADD_FILE))
  }
}

function stringLoader({ id }: Asset) {
  return from(
    readFile(id, 'utf8')
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
    readFile(id)
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
    readJSON(id)
      .then((source) =>
        model.events.LOADED({
          id,
          source,
        }),
      )
      .catch(model.events.ERROR),
  )
}
