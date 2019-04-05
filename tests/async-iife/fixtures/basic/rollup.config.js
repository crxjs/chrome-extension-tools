/* eslint-env node */

import manifestInput from '../../../../src/manifest-input'
import htmlInputs from '../../../../src/html-inputs'
import pkg from '../../../../package.json'
import { join } from 'path'

const fixture = name =>
  join('tests/async-iife/fixtures/basic', name)

export default {
  input: fixture('manifest.json'),
  output: {
    dir: fixture('dest'),
    format: 'esm',
  },
  plugins: [manifestInput({ pkg }), htmlInputs()],
}
