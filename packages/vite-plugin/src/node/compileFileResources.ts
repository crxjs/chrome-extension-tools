import { Manifest as ViteManifest } from 'vite'

export function compileFileResources(
  manifest: ViteManifest,
  fileName: string,
): { assets: Set<string>; css: Set<string>; imports: Set<string> } {
  throw new Error('Function not implemented.')
}
