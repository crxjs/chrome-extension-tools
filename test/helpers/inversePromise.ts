/* eslint-disable no-unused-vars */
export interface InversePromise<T> extends Promise<T> {
  resolve: (value: T | PromiseLike<T>) => void
  reject: (reason: any) => void
}

export function inversePromise<T>(): InversePromise<T> {
  let resolve: any
  let reject: any

  const promise = new Promise<T>((_res, _rej) => {
    resolve = _res
    reject = _rej
  })

  Object.assign(promise, { resolve, reject })

  return promise as InversePromise<T>
}
