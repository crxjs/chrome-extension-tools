import { join } from 'path'
import { from, Observable, of } from 'rxjs'
import { AssetEvent, model } from './files-asset.machine'
import {
  expandMatchPatterns,
  parseManifest,
} from './files_parseManifest'
import { Asset, FileType, Manifest } from './types'

export function manifestParser(
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
