# Vite+ + CRXJS

This playground tracks CRXJS compatibility with the Vite+ beta command surface.
It is a minimal MV3 extension with a popup and a content script.

After loading `dist` as an unpacked extension, open any `https://` page. The
content script adds a CRXJS button in the bottom-right corner; click it to show
the `HELLO CRXJS` panel.

## Commands

```bash
vp install
vp dev
vp check
vp test
vp build
```

The package pins `vite-plus` and the matching Vite core alias so `@crxjs/vite-plugin`
runs through Vite+ locally instead of the regular Vite package.
