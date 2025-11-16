---
"@crxjs/vite-plugin": patch
---

Respect user's build.manifest setting and remove Vite manifest from output

The plugin now properly respects the user's `build.manifest` configuration setting. When `build.manifest` is not explicitly enabled (false or undefined), the `.vite/manifest.json` file is removed from the final build output, keeping the distribution clean.

The plugin still internally generates and uses the Vite manifest for processing content script resources, but removes it from the bundle after use if the user didn't explicitly enable it.

Fixes #1077
