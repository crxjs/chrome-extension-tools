export const siftByPredObj = (
  { filter = () => true, transform = x => x, ...predObj },
  values,
) => {
  const filtered = values.filter(filter)
  const rejected = values.filter(v => !filter(v))

  const [sifted, remainder] = Object.entries(predObj).reduce(
    ([resultObj, remainingValues], [key, predFn]) => [
      {
        ...resultObj,
        [key]: remainingValues
          .filter(v => predFn(v))
          .map(transform),
      },
      remainingValues.filter(v => !predFn(v)),
    ],
    [{}, filtered],
  )

  return {
    ...sifted,
    rejected,
    remainder,
  }
}
