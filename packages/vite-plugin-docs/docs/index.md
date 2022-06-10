---
sidebar_position: 1
slug: '/'
id: 'index'
title: Introduction
---

import GetStartedTip from './\_tip-getting-started.md'

# What is CRXJS?

CRXJS Vite Plugin is a tool that helps you make Chrome Extensions using modern
web development technology.

Things like **HMR** and **static asset imports** work out of the box so you can
get started making a modern Chrome Extension, not configuring build tools.

<GetStartedTip/>

## Why CRXJS?

We've grown to expect a **polished developer experience** these days. Build
tools like Create React App or Vite make it easy to start making a web app.
Unfortunately, building a Chrome Extension isn't the same.

You crawl the web looking for the perfect boilerplate, and the most popular ones
aren't that simple or don't support more than one framework. When it's time to
add another extension page or content script, you have to update your config in
more than one place, and nice things like true HMR for content scripts are hard
to come by.

Not anymore. CRXJS Vite Plugin simplifies the Chrome Extension developer
experience by combining the refined features of Vite with a simple configuration
strategy:

## Use the manifest!

CRXJS parses `manifest.json` to find the files to include in your extension. The
manifest is the central document that declares most of the files and
configuration for your extension, why do we need more?

:::info Help wanted

These docs are a work in progress! We are adding new content every week. If you
have questions or ideas, please
[join the discussion on GitHub](https://github.com/crxjs/chrome-extension-tools/discussions)
or make a PR.

:::
