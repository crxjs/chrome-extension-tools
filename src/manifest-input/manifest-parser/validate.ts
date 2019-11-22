import Ajv from 'ajv'

// TODO: fix schema path
import manifestSchema from './schema.json'
import jsonSchema from 'ajv/lib/refs/json-schema-draft-04.json'

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
