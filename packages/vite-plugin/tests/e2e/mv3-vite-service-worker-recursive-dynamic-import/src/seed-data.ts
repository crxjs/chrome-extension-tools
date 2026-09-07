import('./voices')
  .then(({ voices }) => {
    ;(globalThis as typeof globalThis & { __voices?: string[] }).__voices =
      voices
  })
  .catch(() => {
    // MV3 service workers reject dynamic imports. The worker must still finish
    // evaluating so listeners declared by the entry module are registered.
  })

import('./languages').catch(() => {
  // Real extension graphs commonly have multiple lazy data modules that share
  // dependencies, which makes Vite emit module-preload dependency metadata.
})

export {}
