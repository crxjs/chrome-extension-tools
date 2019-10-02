export const mapObjectFields = (obj, fn) =>
  Object.entries(obj).reduce((r, [key, value]) => {
    if (typeof value !== 'object') {
      return { ...r, [key]: fn(value) }
    } else if (Array.isArray(value)) {
      return { ...r, [key]: value.map(fn) }
    } else {
      return { ...r, [key]: mapObjectFields(value, fn) }
    }
  }, {})
