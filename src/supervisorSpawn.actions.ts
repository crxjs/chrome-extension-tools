import { from } from 'rxjs'
import { assign, MachineOptions, spawn } from 'xstate'
import {
  FileType,
  JsonAsset,
  ManifestAsset,
  RawAsset,
  StringAsset,
} from './file.model'
import { cssFile } from './fileCss.machine'
import { htmlFile } from './fileHtml.machine'
import { imageFile } from './fileImage.machine'
import { jsonFile } from './fileJson.machine'
import { manifestFile } from './fileManifest.machine'
import { rawFile } from './fileRaw.machine'
import { scriptFile } from './fileScript.machine'
import { isString } from './helpers'
import {
  RPCEPlugin,
  SupervisorContext,
  SupervisorEvent,
  supervisorModel as model,
} from './supervisor.model'

type PluginsRunnerOptions<TFileType extends FileType> = {
  fileType: TFileType
  hookType: 'crxTransform' | 'crxRender'
  plugins: Set<RPCEPlugin>
}

const stringAssetPluginsRunner =
  ({
    fileType,
    hookType,
    plugins,
  }: PluginsRunnerOptions<'css' | 'html'>) =>
  (context: StringAsset) =>
    from(
      (async () => {
        try {
          let file = context
          for (const p of plugins) {
            const result = await p[hookType]?.[fileType]?.(
              file.source,
              file,
            )

            if (isString(result)) file.source = result
            else if (result) file = result
          }

          return model.events.READY(file)
        } catch (error) {
          return model.events.ERROR(error)
        }
      })(),
    )
const rawAssetPluginRunner =
  ({
    fileType,
    hookType,
    plugins,
  }: PluginsRunnerOptions<'image' | 'raw'>) =>
  (context: RawAsset) =>
    from(
      (async () => {
        try {
          let file = context
          for (const p of plugins) {
            const result = await p[hookType]?.[fileType]?.(
              file.source,
              file,
            )

            if (result instanceof Uint8Array)
              file.source = result
            else if (result) file = result
          }

          return model.events.READY(file)
        } catch (error) {
          return model.events.ERROR(error)
        }
      })(),
    )
const manifestAssetPluginsRunner =
  ({
    fileType,
    hookType,
    plugins,
  }: PluginsRunnerOptions<'manifest'>) =>
  (context: ManifestAsset) =>
    from(
      (async () => {
        try {
          let { jsonData } = context
          const { packageJson } = context
          for (const p of plugins) {
            jsonData =
              (await p[hookType]?.[fileType]?.(
                jsonData,
                packageJson,
              )) ?? jsonData
          }

          return model.events.READY({ ...context, jsonData })
        } catch (error) {
          return model.events.ERROR(error)
        }
      })(),
    )
const jsonAssetPluginsRunner =
  ({
    fileType,
    hookType,
    plugins,
  }: PluginsRunnerOptions<'json'>) =>
  (context: JsonAsset) =>
    from(
      (async () => {
        try {
          let file = context
          for (const p of plugins) {
            const result = await p[hookType]?.[fileType]?.(file)

            if (!result) continue
            file = result
          }

          return model.events.READY(file)
        } catch (error) {
          return model.events.ERROR(error)
        }
      })(),
    )

export const supervisorSpawnActions: MachineOptions<
  SupervisorContext,
  SupervisorEvent
>['actions'] = {
  spawnCssFile: assign({
    // @ts-expect-error It's close enough 😜
    files: ({ files, plugins }, { file }) => [
      ...files,
      spawn(
        cssFile.withConfig(
          {
            services: {
              runTransformHooks: stringAssetPluginsRunner({
                fileType: 'css',
                hookType: 'crxTransform',
                plugins,
              }),
              runRenderHooks: stringAssetPluginsRunner({
                fileType: 'css',
                hookType: 'crxRender',
                plugins,
              }),
            },
          },
          file,
        ),
        file.id,
      ),
    ],
  }),
  spawnHtmlFile: assign({
    // @ts-expect-error It's close enough 😜
    files: ({ files, plugins }, { file }) => [
      ...files,
      spawn(
        htmlFile.withConfig(
          {
            services: {
              runTransformHooks: stringAssetPluginsRunner({
                fileType: 'html',
                hookType: 'crxTransform',
                plugins,
              }),
              runRenderHooks: stringAssetPluginsRunner({
                fileType: 'html',
                hookType: 'crxRender',
                plugins,
              }),
            },
          },
          file,
        ),
        file.id,
      ),
    ],
  }),
  spawnImageFile: assign({
    // @ts-expect-error It's close enough 😜
    files: ({ files, plugins }, { file }) => [
      ...files,
      spawn(
        imageFile.withConfig(
          {
            services: {
              runTransformHooks: rawAssetPluginRunner({
                fileType: 'image',
                hookType: 'crxTransform',
                plugins,
              }),
              runRenderHooks: rawAssetPluginRunner({
                fileType: 'image',
                hookType: 'crxRender',
                plugins,
              }),
            },
          },
          file,
        ),
        file.id,
      ),
    ],
  }),
  spawnJsonFile: assign({
    // @ts-expect-error It's close enough 😜
    files: ({ files, plugins }, { file }) => [
      ...files,
      spawn(
        jsonFile.withConfig(
          {
            services: {
              runTransformHooks: jsonAssetPluginsRunner({
                fileType: 'json',
                hookType: 'crxTransform',
                plugins,
              }),
              runRenderHooks: jsonAssetPluginsRunner({
                fileType: 'json',
                hookType: 'crxRender',
                plugins,
              }),
            },
          },
          file,
        ),
        file.id,
      ),
    ],
  }),
  spawnManifestFile: assign({
    // @ts-expect-error It's close enough 😜
    files: ({ files, plugins }, { file }) => [
      ...files,
      spawn(
        manifestFile.withConfig(
          {
            services: {
              runTransformHooks: manifestAssetPluginsRunner({
                fileType: 'manifest',
                hookType: 'crxTransform',
                plugins,
              }),
              runRenderHooks: manifestAssetPluginsRunner({
                fileType: 'manifest',
                hookType: 'crxRender',
                plugins,
              }),
            },
          },
          file,
        ),
        'manifest.json',
      ),
    ],
  }),
  spawnRawFile: assign({
    // @ts-expect-error It's close enough 😜
    files: ({ files, plugins }, { file }) => [
      ...files,
      spawn(
        rawFile.withConfig(
          {
            services: {
              runTransformHooks: rawAssetPluginRunner({
                fileType: 'raw',
                hookType: 'crxTransform',
                plugins,
              }),
              runRenderHooks: rawAssetPluginRunner({
                fileType: 'raw',
                hookType: 'crxRender',
                plugins,
              }),
            },
          },
          file,
        ),
        file.id,
      ),
    ],
  }),
  spawnScriptFile: assign({
    // @ts-expect-error It's close enough 😜
    files: ({ files }, { file }) => [
      ...files,
      spawn(scriptFile.withConfig(file), file.id),
    ],
  }),
}
