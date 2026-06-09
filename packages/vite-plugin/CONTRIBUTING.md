# Contributing To `@crxjs/vite-plugin`

## Test In Another Project Without Publishing

Pack the local plugin and install the tarball when you want another extension project to use your local checkout instead of the package from npm.

This is preferred over `pnpm link` because a linked checkout can keep this repository's development dependencies in Node's resolution path. For example, the plugin may import this checkout's local Vite or Rollup version instead of the extension project's Vite peer dependency.

1. Prepare this repository:

```shell
export CRXJS_REPO=/path/to/chrome-extension-tools
cd "$CRXJS_REPO"
git checkout main
git pull --ff-only origin main
pnpm install
```

2. Optionally mark the local package version so it is obvious when the other project resolves this checkout. For example, edit `packages/vite-plugin/package.json`:

```json
"version": "2.5.0-local.<short-git-sha>"
```

3. Build and pack the plugin:

```shell
pnpm build:vite-plugin
mkdir -p "$CRXJS_REPO/.tmp"
cd "$CRXJS_REPO/packages/vite-plugin"
pnpm pack --out "$CRXJS_REPO/.tmp/crxjs-vite-plugin.tgz"
```

4. Install the packed plugin into the extension project:

```shell
export EXTENSION_PROJECT=/path/to/extension-project
cd "$EXTENSION_PROJECT"
npm install --save-dev "$CRXJS_REPO/.tmp/crxjs-vite-plugin.tgz"
```

If the extension project uses pnpm, use `pnpm add -D "$CRXJS_REPO/.tmp/crxjs-vite-plugin.tgz"` instead.

5. Verify that the project resolves the packed package:

```shell
node -p "require.resolve('@crxjs/vite-plugin/package.json')"
```

The plugin package path should point inside the extension project's `node_modules`, not at `$CRXJS_REPO/packages/vite-plugin`.

6. Run the extension project's build and dev scripts:

```shell
npm run build
npm run dev
```

After CRXJS code changes, rebuild, repack, and reinstall the tarball:

```shell
cd "$CRXJS_REPO"
pnpm build:vite-plugin
cd "$CRXJS_REPO/packages/vite-plugin"
pnpm pack --out "$CRXJS_REPO/.tmp/crxjs-vite-plugin.tgz"
cd "$EXTENSION_PROJECT"
npm install --save-dev "$CRXJS_REPO/.tmp/crxjs-vite-plugin.tgz"
```

To return to the registry package, reinstall the desired registry version:

```shell
cd "$EXTENSION_PROJECT"
npm install --save-dev @crxjs/vite-plugin@latest
```
