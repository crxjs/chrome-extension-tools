# Contributing To `@crxjs/vite-plugin`

## Test In Another Project Without Publishing

Use a direct link when you want another extension project to use your local checkout instead of the package from npm.

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

3. Build the plugin:

```shell
pnpm build:vite-plugin
```

4. Link the plugin into the extension project:

```shell
export EXTENSION_PROJECT=/path/to/extension-project
cd "$EXTENSION_PROJECT"
rm -rf node_modules
pnpm link "$CRXJS_REPO/packages/vite-plugin"
```

Removing `node_modules` first is useful when the target project was previously installed by a different package manager.

5. Verify that the project resolves the linked package:

```shell
node -p "require.resolve('@crxjs/vite-plugin/package.json')"
```

The plugin package path should point at `$CRXJS_REPO/packages/vite-plugin`.

6. Run the extension project's build and dev scripts:

```shell
npm run build
npm run dev
```

After CRXJS code changes, rebuild the plugin. The linked project will use the updated `dist` output without reinstalling:

```shell
cd "$CRXJS_REPO"
pnpm build:vite-plugin
```

To return to the registry package, reinstall from the target project's lockfile:

```shell
cd "$EXTENSION_PROJECT"
npm install
```
