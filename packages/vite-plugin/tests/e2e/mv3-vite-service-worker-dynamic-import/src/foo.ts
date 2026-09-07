import('./data')
  .then(({ voices }) => {
    ;(globalThis as typeof globalThis & { __voices?: string[] }).__voices =
      voices
  })
  .catch(() => {
    ;(
      globalThis as typeof globalThis & { __importCaught?: boolean }
    ).__importCaught = true
  })

export {}
