import Ajv from 'ajv'

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

export const validate = json => {
  if (validator(json)) {
    return json
  }

  const { errors } = validator
  const msg = `This manifest has ${errors.length} problems.`

  throw new ValidationError(msg, errors)
}

class ValidationError extends Error {
  constructor(msg, errors) {
    super(msg)
    this.name = 'ValidationError'
    this.errors = errors
  }
}
