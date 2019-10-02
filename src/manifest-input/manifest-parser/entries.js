import { flattenObject } from './flat'
import { siftByPredObj } from './sift'

export const deriveEntries = (
  {
    manifest_version,
    name,
    version,
    description,
    author,
    short_name,
    permissions,
    content_security_policy,
    key,
    ...manifest
  },
  options,
) => {
  const values = flattenObject(manifest)
  const unique = Array.from(new Set(values))

  return siftByPredObj(options, unique)
}
