export function delay<T>(ms: number) {
  return new Promise<T>((resolve) => {
    setTimeout(resolve, ms)
  })
}
