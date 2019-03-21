export const mapObjectValues = (obj, fn) =>
  Object.entries(obj).reduce((r, [key, value]) => {
    if (typeof value !== 'object') {
      // is primitive
      return { ...r, [key]: fn(value) }
    } else if (Array.isArray(value)) {
      // is array
      return { ...r, [key]: value.map(fn) }
    } else {
      // is plain object
      return { ...r, [key]: mapObjectValues(value, fn) }
    }
  }, {})
