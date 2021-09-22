import { getDeepMatches } from './getDeepMatches'

test("null keys don't cause an exception to be thrown when the predicate doesn't match", () => {
  const obj = {
    runtime: {
      lastError: null,
      onMessage: {
        addListener() {},
      },
    },
  }
  expect(getDeepMatches(obj, (x) => typeof x === 'object' && 'addListener' in x, [])).toEqual([
    {
      addListener: obj.runtime.onMessage.addListener,
    },
  ])
})
