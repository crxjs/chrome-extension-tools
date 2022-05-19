---
sidebar_position: 1
---

# What is CRXJS Vite Plugin?

CRXJS Vite Plugin is a tool that helps you make Chrome Extensions using modern
web development technology.

Things like **HMR** and **static asset imports** work out of the box so you can
get started making things, not configuring build tools.

:::tip Get started in 90 seconds

We have tutorials for the following frameworks. Pick one to start:

### ![React Logo](./assets/React-icon.svg) [React](./react/create-project)

### ![JS Logo](./assets/JS-icon.svg) [Vanilla JavaScript](./vanilla/create-project)

### ![Vue Logo](./assets/Vue-icon.svg) Vue (coming soon!)

:::

## Why CRXJS?

We've grown to expect a polished developer experience these days. Build tools
like Create React App or Vite make it easy to start making a web app.
Unfortunately, building a Chrome Extension isn't the same.

You crawl the web looking for the perfect boilerplate, and the most popular ones
aren't that simple or don't support more than one framework. When it's time to
add another extension page or content script, you have to update your config in
more than one place, and nice things like true HMR for content scripts are hard
to come by.

Not anymore. CRXJS Vite Plugin simplifies the Chrome Extension developer
experience by combining the refined features of Vite with a simple configuration
strategy: Just use the manifest. CRXJS parses `manifest.json` to find the files
to include in your extension.

## Missing something?

These docs are a work in progress! We are adding new content every week. If you
have questions or ideas, please join the discussion on GitHub.
