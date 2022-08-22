---
id: content-script-hmr
title: Content script HMR
description: Developing a Solid content script with Vite and CRXJS
tags:
  - Content script
  - Solid
# could point this to a TypeScript manifest guide
pagination_next: concepts/manifest
---

# Solid and Content Scripts

Make sure that your extension is [loaded in the browser](dev-basics) and that
you've started Vite. Navigate to `https://www.google.com` and scroll to the
bottom of the page.

There's our familiar Vite-Solid Hello World!

<!-- TODO: add screenshot of raw content script -->

## Leaking CSS styles

Let's try to change the Learn Solid `<a>` link to a button.

```css title="src/App.jsx"
// highlight-next-line
<button
  class={styles.link}
  href="https://github.com/solidjs/solid"
  target="_blank"
  rel="noopener noreferrer"
>
  Learn Solid
// highlight-next-line
</button>
```

Notice how our button doesn't look like a button. That's because
Google's styles affect our content script elements. The same goes the other way:
our styles change Google's styles.

:::tip

The CSS of the host page will affect your content script, and the CSS of the
content script will affect the host page.

:::

Let's fix that button. Replace everything in `src/index.css` with this:

```css title="src/index.css"
#crx-root {
  position: fixed;
  top: 3rem;
  left: 50%;
  transform: translate(-50%, 0);
}

#crx-root button {
  background-color: rgb(239, 239, 239);
  border-color: rgb(118, 118, 118);
  border-image: initial;
  border-style: outset;
  border-width: 2px;
  margin: 0;
  padding: 1px 6px;
}
```

CRXJS will quickly rebuild the content script, and our CSS changes will take
effect.

<!-- TODO: add screenshot of fixed content script -->

Now our `div` position is fixed, and the button looks more like a button!

## Solid Refresh in action

CRXJS does some magic behind the scenes to get Solid Refresh working in content
scripts.

<!-- TODO: add more detailed instructions -->
