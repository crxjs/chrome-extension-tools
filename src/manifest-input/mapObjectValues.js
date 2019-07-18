export const mapObjectValues = (obj, fn) => {
  if (typeof obj !== 'object') {
    return fn(obj)
  } else if (Array.isArray(obj)) {
    return obj.map((v) => mapObjectValues(v, fn))
  } else {
    return Object.entries(obj).reduce((r, [key, value]) => {
      if (typeof value !== 'object') {
        // is primitive
        return { ...r, [key]: fn(value) }
      } else if (Array.isArray(value)) {
        // is array
        return {
          ...r,
          [key]: value.map((v) => mapObjectValues(v, fn)),
        }
      } else {
        // is plain object
        return { ...r, [key]: mapObjectValues(value, fn) }
      }
    }, {})
  }
}
