import Ajv from 'ajv'
import { JsonPointer } from 'json-ptr'
import schema from '../../../schema/manifest-strict.schema.json'
import schemaMV2 from '../../../schema/manifest-v2.schema.json'
import schemaMV3 from '../../../schema/manifest-v3.schema.json'

export const ajv = new Ajv({
  schemas: [schema, schemaMV2, schemaMV3],
  strict: false,
  verbose: true,
})

ajv.addFormat('glob-pattern', true)
ajv.addFormat('match-pattern', true)
ajv.addFormat('content-security-policy', true)
ajv.addFormat('mime-type', true)
ajv.addFormat('permission', true)

const validator = ajv.compile(schema)

const setupPointer = (target: Record<string, unknown>) => (
  pointer: string,
): string | Record<string, unknown> =>
  JsonPointer.create(pointer).get(target) as string

const getSchemaDataMV2 = setupPointer(schemaMV2)
const getSchemaDataMV3 = setupPointer(schemaMV3)

const ignoredErrors = [
  'must match "then" schema',
  'must match "else" schema',
]

export function validateManifest<
  T extends chrome.runtime.ManifestBase
>(manifest: T): T {
  const valid = validator(manifest)
  if (valid === true) return manifest

  const getValue = setupPointer(manifest)
  const getDesc =
    manifest.manifest_version === 2
      ? getSchemaDataMV2
      : getSchemaDataMV3

  throw new Error(
    [
      'There were problems with the extension manifest.',
      ...(validator.errors
        ?.filter(
          ({ message }) =>
            message && !ignoredErrors.includes(message),
        )
        .map((e) => {
          const schemaPath = `/${e.schemaPath
            .split('/')
            .slice(1, -1)
            .concat('description')
            .join('/')}`
          const desc = getDesc(schemaPath) ?? e.message

          if (e.instancePath.length === 0) {
            return `- Manifest ${desc}`
          }

          return `- ${JSON.stringify(
            getValue(e.instancePath),
          )} at "${e.instancePath}" ${desc}`
        }) ?? []),
    ].join('\n'),
  )
}
