import { from } from 'rxjs'
import fs from 'fs-extra'
import { InvokeCreator } from 'xstate'
import {
  FileEvent,
  JsonAsset,
  ManifestAsset,
  fileModel as model,
  RawAsset,
  StringAsset,
} from './file.model'
import { cosmiconfig } from 'cosmiconfig'
import readPkgUp from 'read-pkg-up'
import { isUndefined } from './helpers'

export const loadStringAsset: InvokeCreator<
  StringAsset,
  FileEvent
> = ({ id, ...rest }) =>
  from(
    fs
      .readFile(id, 'utf8')
      .then((source) =>
        model.events.READY({
          id,
          ...rest,
          source,
        }),
      )
      .catch(model.events.ERROR),
  )

export const loadRawAsset: InvokeCreator<RawAsset, FileEvent> =
  ({ id, ...rest }) =>
    from(
      fs
        .readFile(id)
        .then((source) =>
          model.events.READY({
            id,
            ...rest,
            source,
          }),
        )
        .catch(model.events.ERROR),
    )

// TODO: support alternate file formats (use cosmiconfig?)
export const loadJsonAsset: InvokeCreator<JsonAsset, FileEvent> =
  ({ id, ...rest }) =>
    from(
      fs
        .readJSON(id)
        .then((jsonData) =>
          model.events.READY({
            id,
            ...rest,
            jsonData,
          }),
        )
        .catch(model.events.ERROR),
    )

export const loadPackageJson: InvokeCreator<
  ManifestAsset,
  FileEvent
> = ({ id, ...rest }) =>
  from(
    readPkgUp()
      .then((result) => {
        if (isUndefined(result))
          throw new Error('Could not load package.json')

        return model.events.READY({
          id,
          ...rest,
          packageJson: result.packageJson,
        })
      })
      .catch(model.events.ERROR),
  )

export const explorer = cosmiconfig('manifest', {
  cache: false,
  loaders: {
    '.ts': (filePath: string) => {
      require('esbuild-runner/register')
      const result = require(filePath)

      return result.default ?? result
    },
  },
})
export const loadManifest: InvokeCreator<
  ManifestAsset,
  FileEvent
> = ({ id, ...rest }) =>
  from(
    explorer
      .load(id)
      .then((result) => {
        if (result === null)
          throw new Error(
            `Could not load manifest at location: ${id}`,
          )
        if (result.isEmpty)
          throw new Error(`Manifest is empty at location: ${id}`)

        return model.events.READY({
          id,
          ...rest,
          jsonData: result.config,
        })
      })
      .catch(model.events.ERROR),
  )
