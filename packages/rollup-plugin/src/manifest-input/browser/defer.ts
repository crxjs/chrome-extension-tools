export function defer<T>() {
  let resolve: (value?: T) => void
  let reject: (error: any) => void
  const promise = new Promise<T | undefined>((res, rej) => {
    resolve = res
    reject = rej
  })

  return Object.assign(promise, {
    resolve(value?: T) {
      resolve!(value)
    },
    reject(error: any) {
      reject!(error)
    },
  }) as Promise<T> & {
    resolve: typeof resolve
    reject: typeof reject
  }
}
