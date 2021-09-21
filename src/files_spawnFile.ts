import { readFile, readJSON } from 'fs-extra'
import { dirname, join, relative, resolve } from 'path'
import { from, Observable, of } from 'rxjs'
import { spawn } from 'xstate'
import {
  AssetEvent,
  assetMachine,
  model,
} from './files-asset.machine'
import { scriptMachine } from './files-script.machine'
import { parseHtml } from './files_parseHtml'
import {
  expandMatchPatterns,
  parseManifest,
} from './files_parseManifest'
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
  if (isScript(file))
    return spawn(scriptMachine.withContext(file), file.id)

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
    { name: file.id },
  )
}

function manifestParser(
  root: string,
): (context: Asset) => Observable<AssetEvent> {
  return ({ source }) => {
    try {
      const result = Object.entries(
        parseManifest(source as Manifest),
      ) as [FileType, string[]][]

      const files = result.flatMap(([fileType, fileNames]) =>
        fileNames
          .flatMap(expandMatchPatterns(root))
          .map((fileName) => ({
            fileType,
            fileName,
            id: join(root, fileName),
          })),
      )

      return from(files.map(model.events.ADD_FILE))
    } catch (error) {
      return of(model.events.ERROR(error))
    }
  }
}

function htmlParser(
  root: string,
): (context: Asset) => Observable<AssetEvent> {
  return ({ id: htmlId, source }) => {
    try {
      const htmlDir = dirname(htmlId)

      const result = Object.entries(
        parseHtml(source as string),
      ) as [FileType, string[]][]

      const files = result.flatMap(([fileType, fileNames]) =>
        fileNames.map((htmlFileName): Script | BaseAsset => {
          const id = resolve(htmlDir, htmlFileName)
          const fileName = relative(root, id)

          return {
            fileType,
            id,
            fileName,
          }
        }),
      )

      return from(files.map(model.events.ADD_FILE))
    } catch (error) {
      return of(model.events.ERROR(error))
    }
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
