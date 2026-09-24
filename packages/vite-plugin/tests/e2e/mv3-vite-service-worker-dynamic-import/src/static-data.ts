import { staticSeed } from './data'
;(globalThis as typeof globalThis & { __staticSeed?: string }).__staticSeed =
  staticSeed
