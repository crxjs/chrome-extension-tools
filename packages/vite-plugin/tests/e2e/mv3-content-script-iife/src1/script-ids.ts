/** Dynamically registered regular ESM content script (imported with `?script`). */
export const dynamicRegularId = 'dynamic-regular' as const

/** Dynamically registered IIFE content script via `.iife.ts` filename convention. */
export const dynamicIifeId = 'dynamic-iife' as const

/** Dynamically registered IIFE content script via bare `?iife` query on a normal-named file. */
export const dynamicBareIifeAliasId = 'dynamic-bare-iife-alias' as const

/** Manifest-declared regular ESM content script (emitted via loader pattern). */
export const regularContentId = 'regular-content' as const

/** Manifest-declared IIFE content script via `.iife.ts` filename convention. */
export const iifeContentId = 'iife-content' as const

/** Manifest-declared IIFE content script via `contentScripts.standaloneFiles` (normal filename). */
export const standaloneIifeScriptId = 'standalone-iife-script' as const

/**
 * Marker ID inside `normal-iife-alias.ts` — distinct from [[dynamicBareIifeAliasId]],
 * which is the `chrome.scripting` registration ID for the same script.
 */
export const bareIifeAliasScriptId = 'bare-iife-alias-script' as const
