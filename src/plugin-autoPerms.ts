import { Manifest } from 'vite'
import mem from 'mem'
import { OutputAsset } from 'rollup'
import * as permTests from './plugin-autoPerms_permTests'
import { CrxPlugin } from './types'

const permTestEntries = Object.entries(permTests).filter(
  // esbuild includes the default export
  ([key]) => key !== 'default',
)

/**
 * Auto Permissions CRX Plugin
 *
 * Tracks dynamically used permissions in code.
 * Permissions used in served files are not currently included.
 * Updates the manifest manually in generateBundle.
 *
 * TODO: Should we use the renderCrxManifest hook?
 * TODO: Use a watched file to trigger a reload of the manifest?
 */
export const autoPerms = (): CrxPlugin => {
  const required = new Set<string>() // perms from manifest.permissions
  const excluded = new Set<string>() // except perms that start with "!"
  const optional = new Set<string>() // perms from manifest.optional_permissions
  const live = new Set<string>() // perms detected in rendered code

  const updateLivePerms = mem((code: string) => {
    permTestEntries
      .filter(([, fn]) => fn(code))
      .map(([key]) => key)
      .reduce((s, p) => s.add(p), live)
  })

  return {
    name: 'auto-perms',
    crx: true,
    transformCrxManifest(manifest) {
      const { permissions = [], optional_permissions = [] } =
        manifest

      permissions.forEach((p) => {
        if (p.startsWith('!')) excluded.add(p.slice(1))
        else required.add(p)
      })

      optional_permissions.forEach((p) => optional.add(p))

      manifest.permissions = Array.from(required)

      return manifest
    },
    // renderChunk does not run in Vite Serve
    renderChunk(code) {
      updateLivePerms(code)
      return null
    },
    generateBundle(options, bundle) {
      const perms = new Set(required)
      live.forEach((p) => perms.add(p))
      optional.forEach((p) => perms.delete(p))
      excluded.forEach((p) => perms.delete(p))

      if (perms.size === 0) return

      const permissions = Array.from(perms)

      this.warn(
        `Detected permissions: ${permissions
          .filter((p) => !required.has(p))
          .map((p) => `  - ${p}`)}`,
      )

      const manifestOutput = Object.values(bundle).find(
        ({ fileName }) => fileName === 'manifest.json',
      ) as OutputAsset

      const manifest = JSON.parse(
        manifestOutput.source as string,
      ) as Manifest

      manifestOutput.source = JSON.stringify({
        ...manifest,
        permissions,
      })
    },
  }
}
