export const flattenObject = obj =>
  Object.values(obj).reduce((primitivesArray, objValue) => {
    if (typeof objValue !== 'object') {
      return [...primitivesArray, objValue]
    } else {
      return [...flattenObject(objValue), ...primitivesArray]
    }
  }, [])
