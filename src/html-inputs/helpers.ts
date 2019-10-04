/* ------------- helper functions ------------- */

export const not = <T>(fn: (x: T) => boolean) => (x: T) => !fn(x)
