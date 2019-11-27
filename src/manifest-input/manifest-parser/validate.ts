import Ajv from 'ajv'
import { readJSONSync } from 'fs-extra'
import { resolve } from 'path'
import { ChromeExtensionManifest } from '../../manifest'

// import jsonSchema from 'ajv/lib/refs/json-schema-draft-04.json'
const jsonSchema = readJSONSync(
  resolve(__dirname, 'json-schema-draft-04.json'),
)
// import manifestSchema from './schema.json'
const manifestSchema = readJSONSync(
  resolve(__dirname, 'schema-web-ext-manifest-v2.json'),
)

export const ajv = new Ajv({
  verbose: true,
  schemaId: 'auto',
  schemas: {
    'http://json-schema.org/draft-04/schema#': jsonSchema,
  },
  strictDefaults: true,
})

// ajv.addMetaSchema(jsonSchema)

const validator = ajv.compile(manifestSchema)

export const validateManifest = (
  manifest: ChromeExtensionManifest,
) => {
  if (validator(manifest)) {
    return manifest
  }

  const { errors } = validator
  const msg = `This manifest has ${errors!.length} problems.`

  throw new ValidationError(msg, errors)
}

type ValidationErrorsArray = Ajv.ErrorObject[] | null | undefined
class ValidationError extends Error {
  constructor(msg: string, errors: ValidationErrorsArray) {
    super(msg)
    this.name = 'ValidationError'
    this.errors = errors
  }
  errors: ValidationErrorsArray
}
