import { simple } from 'acorn-walk';
import { createHash } from 'crypto';
import debug$3 from 'debug';
import v8 from 'v8';
import { posix } from 'path';
import { Subject, filter, ReplaySubject, switchMap, of, startWith, map, BehaviorSubject, mergeMap, firstValueFrom, takeUntil, first, toArray, retry, concatWith, Subscription, buffer } from 'rxjs';
import fsx from 'fs-extra';
import { performance } from 'perf_hooks';
import { rollup } from 'rollup';
import * as lexer from 'es-module-lexer';
import { readFile as readFile$1 } from 'fs/promises';
import MagicString from 'magic-string';
import convertSourceMap from 'convert-source-map';
import { createLogger } from 'vite';
import { readFileSync, existsSync, promises } from 'fs';
import { createRequire } from 'module';
import fg from 'fast-glob';
import { load } from 'cheerio';
import jsesc from 'jsesc';
import colors from 'picocolors';

const pluginName$1 = "crx:optionsProvider";
const pluginOptionsProvider = (options) => {
  return {
    name: pluginName$1,
    api: {
      crx: {
        // during testing this can be null, we don't provide options through the test config
        options
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }
  };
};
const getOptions = async ({
  plugins
}) => {
  if (typeof plugins === "undefined") {
    throw new Error("config.plugins is undefined");
  }
  const awaitedPlugins = await Promise.all(plugins);
  let options;
  for (const p of awaitedPlugins.flat()) {
    if (isCrxPlugin(p)) {
      if (p.name === pluginName$1) {
        const plugin = p;
        options = plugin.api.crx.options;
        if (options)
          break;
      }
    }
  }
  if (typeof options === "undefined") {
    throw Error("Unable to get CRXJS options");
  }
  return options;
};
function isCrxPlugin(p) {
  return !!p && typeof p === "object" && !(p instanceof Promise) && !Array.isArray(p) && p.name.startsWith("crx:");
}

var workerHmrClient = "const ownOrigin = new URL(chrome.runtime.getURL(\"/\")).origin;\nself.addEventListener(\"fetch\", (fetchEvent) => {\n  const url = new URL(fetchEvent.request.url);\n  if (url.origin === ownOrigin) {\n    fetchEvent.respondWith(sendToServer(url));\n  }\n});\nasync function sendToServer(url) {\n  url.protocol = \"http:\";\n  url.host = \"localhost\";\n  url.port = __SERVER_PORT__;\n  url.searchParams.set(\"t\", Date.now().toString());\n  const response = await fetch(url.href.replace(/=$|=(?=&)/g, \"\"));\n  return new Response(response.body, {\n    headers: {\n      \"Content-Type\": response.headers.get(\"Content-Type\") ?? \"text/javascript\"\n    }\n  });\n}\nconst ports = /* @__PURE__ */ new Set();\nchrome.runtime.onConnect.addListener((port) => {\n  if (port.name === \"@crx/client\") {\n    ports.add(port);\n    port.onDisconnect.addListener((port2) => ports.delete(port2));\n    port.onMessage.addListener((message) => {\n    });\n    port.postMessage({ data: JSON.stringify({ type: \"connected\" }) });\n  }\n});\nfunction notifyContentScripts(payload) {\n  const data = JSON.stringify(payload);\n  for (const port of ports)\n    port.postMessage({ data });\n}\nconsole.log(\"[vite] connecting...\");\nconst socketProtocol = __HMR_PROTOCOL__ || (location.protocol === \"https:\" ? \"wss\" : \"ws\");\nconst socketHost = `${__HMR_HOSTNAME__ || location.hostname}:${__HMR_PORT__}`;\nconst socket = new WebSocket(`${socketProtocol}://${socketHost}`, \"vite-hmr\");\nconst base = __BASE__ || \"/\";\nsocket.addEventListener(\"message\", async ({ data }) => {\n  handleSocketMessage(JSON.parse(data));\n});\nfunction isCrxHmrPayload(x) {\n  return x.type === \"custom\" && x.event.startsWith(\"crx:\");\n}\nfunction handleSocketMessage(payload) {\n  if (isCrxHmrPayload(payload)) {\n    handleCrxHmrPayload(payload);\n  } else if (payload.type === \"connected\") {\n    console.log(`[vite] connected.`);\n    const interval = setInterval(() => socket.send(\"ping\"), __HMR_TIMEOUT__);\n    socket.addEventListener(\"close\", () => clearInterval(interval));\n  }\n}\nfunction handleCrxHmrPayload(payload) {\n  notifyContentScripts(payload);\n  switch (payload.event) {\n    case \"crx:runtime-reload\":\n      console.log(\"[crx] runtime reload\");\n      chrome.runtime.reload();\n      break;\n  }\n}\nasync function waitForSuccessfulPing(ms = 1e3) {\n  while (true) {\n    try {\n      await fetch(`${base}__vite_ping`);\n      break;\n    } catch (e) {\n      await new Promise((resolve) => setTimeout(resolve, ms));\n    }\n  }\n}\nsocket.addEventListener(\"close\", async ({ wasClean }) => {\n  if (wasClean)\n    return;\n  console.log(`[vite] server connection lost. polling for restart...`);\n  await waitForSuccessfulPing();\n  handleCrxHmrPayload({\n    type: \"custom\",\n    event: \"crx:runtime-reload\"\n  });\n});\n";

const _debug = (id) => debug$3("crx").extend(id);
const structuredClone = (obj) => {
  return v8.deserialize(v8.serialize(obj));
};
const hash = (data, length = 5) => createHash("sha1").update(data).digest("base64").replace(/[^A-Za-z0-9]/g, "").slice(0, length);
const isString = (x) => typeof x === "string";
function isObject(value) {
  return Object.prototype.toString.call(value) === "[object Object]";
}
const isResourceByMatch = (x) => "matches" in x;
function decodeManifest(code) {
  const tree = this.parse(code);
  let literal;
  let templateElement;
  simple(tree, {
    Literal(node) {
      literal = node;
    },
    TemplateElement(node) {
      templateElement = node;
    }
  });
  let manifestJson = literal?.value;
  if (!manifestJson)
    manifestJson = templateElement?.value?.cooked;
  if (!manifestJson)
    throw new Error("unable to parse manifest code");
  let result = JSON.parse(manifestJson);
  if (typeof result === "string")
    result = JSON.parse(result);
  return result;
}
function encodeManifest(manifest) {
  const json = JSON.stringify(JSON.stringify(manifest));
  return `export default ${json}`;
}
function parseJsonAsset(bundle, key) {
  const asset = bundle[key];
  if (typeof asset === "undefined")
    throw new TypeError(`OutputBundle["${key}"] is undefined.`);
  if (asset.type !== "asset")
    throw new Error(`OutputBundle["${key}"] is not an OutputAsset.`);
  if (typeof asset.source !== "string")
    throw new TypeError(`OutputBundle["${key}"].source is not a string.`);
  return JSON.parse(asset.source);
}
const getMatchPatternOrigin = (pattern) => {
  if (pattern.startsWith("<"))
    return pattern;
  const [schema, rest] = pattern.split("://");
  const [origin, pathname] = rest.split("/");
  const root = `${schema}://${origin}`;
  return pathname ? `${root}/*` : root;
};

const {
  basename,
  dirname,
  extname,
  delimiter,
  format,
  isAbsolute,
  join,
  normalize,
  parse,
  relative,
  resolve,
  toNamespacedPath,
  sep
} = posix;

function defineClientValues(code, config) {
  let options = config.server.hmr;
  options = options && typeof options !== "boolean" ? options : {};
  const host = options.host || null;
  const protocol = options.protocol || null;
  const timeout = options.timeout || 3e4;
  const overlay = options.overlay !== false;
  let hmrPort;
  if (isObject(config.server.hmr)) {
    hmrPort = config.server.hmr.clientPort || config.server.hmr.port;
  }
  if (config.server.middlewareMode) {
    hmrPort = String(hmrPort || 24678);
  } else {
    hmrPort = String(hmrPort || options.port || config.server.port);
  }
  let hmrBase = config.base;
  if (options.path) {
    hmrBase = join(hmrBase, options.path);
  }
  if (hmrBase !== "/") {
    hmrPort = normalize(`${hmrPort}${hmrBase}`);
  }
  return code.replace(`__MODE__`, JSON.stringify(config.mode)).replace(`__BASE__`, JSON.stringify(config.base)).replace(`__DEFINES__`, serializeDefine(config.define || {})).replace(`__HMR_PROTOCOL__`, JSON.stringify(protocol)).replace(`__HMR_HOSTNAME__`, JSON.stringify(host)).replace(`__HMR_PORT__`, JSON.stringify(hmrPort)).replace(`__HMR_TIMEOUT__`, JSON.stringify(timeout)).replace(`__HMR_ENABLE_OVERLAY__`, JSON.stringify(overlay)).replace(`__SERVER_PORT__`, JSON.stringify(config.server.port?.toString()));
  function serializeDefine(define) {
    let res = `{`;
    for (const key in define) {
      const val = define[key];
      res += `${JSON.stringify(key)}: ${typeof val === "string" ? `(${val})` : JSON.stringify(val)}, `;
    }
    return res + `}`;
  }
}

class RxMap extends Map {
  static isChangeType = {
    clear: (x) => x.type === "clear",
    delete: (x) => x.type === "delete",
    set: (x) => x.type === "set"
  };
  change$;
  constructor(iterable) {
    super(iterable);
    const change$ = new Subject();
    this.change$ = change$.asObservable();
    const changeMethodKeys = ["clear", "set", "delete"];
    for (const type of changeMethodKeys) {
      const method = this[type];
      this[type] = function(...args) {
        const result = method.call(this, ...args);
        change$.next({ type, key: args[0], value: args[1], map: this });
        return result;
      }.bind(this);
    }
  }
}

const outputFiles = new RxMap();

_debug("file-writer").extend("utilities");
function prefix$1(prefix2, text) {
  return text.startsWith(prefix2) ? text : prefix2 + text;
}
function strip(prefix2, text) {
  return text?.startsWith(prefix2) ? text?.slice(prefix2.length) : text;
}
function formatFileData(script) {
  script.id = prefix$1("/", script.id);
  if (script.fileName)
    script.fileName = strip("/", script.fileName);
  if (script.loaderName)
    script.loaderName = strip("/", script.loaderName);
  return script;
}
function getFileName({ type, id }) {
  let fileName = id.replace(/t=\d+&/, "").replace(/\?t=\d+$/, "").replace(/^\//, "").replace(/\?/g, "__").replace(/&/g, "_").replace(/=/g, "--");
  if (fileName.includes("node_modules/")) {
    fileName = `vendor/${fileName.split("node_modules/").pop().replace(/\//g, "-")}`;
  } else if (fileName.startsWith("@")) {
    fileName = `vendor/${fileName.slice("@".length).replace(/\//g, "-")}`;
  } else if (fileName.startsWith(".vite/deps/")) {
    fileName = `vendor/${fileName.slice(".vite/deps/".length)}`;
  }
  switch (type) {
    case "iife":
      return `${fileName}.iife.js`;
    case "loader":
      return `${fileName}-loader.js`;
    case "module":
      return `${fileName}.js`;
    case "asset":
      return fileName;
    default:
      throw new Error(
        `Unexpected script type "${type}" for "${JSON.stringify({
          type,
          id
        })}"`
      );
  }
}
function getOutputPath(server, fileName) {
  const {
    root,
    build: { outDir }
  } = server.config;
  const target = isAbsolute(outDir) ? join(outDir, fileName) : join(root, outDir, fileName);
  return target;
}
function getViteUrl({ type, id }) {
  if (type === "asset") {
    throw new Error(`File type "${type}" not implemented.`);
  } else if (type === "iife") {
    throw new Error(`File type "${type}" not implemented.`);
  } else if (type === "loader") {
    throw new Error("Vite does not transform loader files.");
  } else if (type === "module") {
    if (id.startsWith("/@id/"))
      return id.slice("/@id/".length).replace("__x00__", "\0");
    return prefix$1("/", id);
  } else {
    throw new Error(`Invalid file type: "${type}"`);
  }
}
async function fileReady(script) {
  const fileName = getFileName(script);
  const file = outputFiles.get(fileName);
  if (!file)
    throw new Error("unknown script type and id");
  const { deps } = await file.file;
  await Promise.all(deps.map(fileReady));
}

const viteClientId = "/@vite/client";
const customElementsId = "/@webcomponents/custom-elements";
const contentHmrPortId = "/@crx/client-port";
const manifestId = "/@crx/manifest";
const preambleId = "/@crx/client-preamble";
const stubId = "/@crx/stub";
const workerClientId = "/@crx/client-worker";

const pluginBackground = () => {
  let config;
  return [
    {
      name: "crx:background-client",
      apply: "serve",
      resolveId(source) {
        if (source === `/${workerClientId}`)
          return workerClientId;
      },
      load(id) {
        if (id === workerClientId) {
          const base = `http://localhost:${config.server.port}/`;
          return defineClientValues(
            workerHmrClient.replace("__BASE__", JSON.stringify(base)),
            config
          );
        }
      }
    },
    {
      name: "crx:background-loader-file",
      // this should happen after other plugins; the loader file is an implementation detail
      enforce: "post",
      configResolved(_config) {
        config = _config;
      },
      renderCrxManifest(manifest) {
        const worker = manifest.background?.service_worker;
        let loader;
        if (config.command === "serve") {
          const port = config.server.port?.toString();
          if (typeof port === "undefined")
            throw new Error("server port is undefined in watch mode");
          loader = `import 'http://localhost:${port}/@vite/env';
`;
          loader += `import 'http://localhost:${port}${workerClientId}';
`;
          if (worker)
            loader += `import 'http://localhost:${port}/${worker}';
`;
        } else if (worker) {
          loader = `import './${worker}';
`;
        } else {
          return null;
        }
        const refId = this.emitFile({
          type: "asset",
          // fileName b/c service worker must be at root of crx
          fileName: getFileName({ type: "loader", id: "service-worker" }),
          source: loader
        });
        manifest.background = {
          service_worker: this.getFileName(refId),
          type: "module"
        };
        return manifest;
      }
    }
  ];
};

var contentHmrPort = "function isCrxHMRPayload(x) {\n  return x.type === \"custom\" && x.event.startsWith(\"crx:\");\n}\nclass HMRPort {\n  port;\n  callbacks = /* @__PURE__ */ new Map();\n  constructor() {\n    setInterval(() => {\n      try {\n        this.port?.postMessage({ data: \"ping\" });\n      } catch (error) {\n        if (error instanceof Error && error.message.includes(\"Extension context invalidated.\")) {\n          location.reload();\n        } else\n          throw error;\n      }\n    }, __CRX_HMR_TIMEOUT__);\n    setInterval(this.initPort, 5 * 60 * 1e3);\n    this.initPort();\n  }\n  initPort = () => {\n    this.port?.disconnect();\n    this.port = chrome.runtime.connect({ name: \"@crx/client\" });\n    this.port.onDisconnect.addListener(this.handleDisconnect.bind(this));\n    this.port.onMessage.addListener(this.handleMessage.bind(this));\n    this.port.postMessage({ type: \"connected\" });\n  };\n  handleDisconnect = () => {\n    if (this.callbacks.has(\"close\"))\n      for (const cb of this.callbacks.get(\"close\")) {\n        cb({ wasClean: true });\n      }\n  };\n  handleMessage = (message) => {\n    const forward = (data) => {\n      if (this.callbacks.has(\"message\"))\n        for (const cb of this.callbacks.get(\"message\")) {\n          cb({ data });\n        }\n    };\n    const payload = JSON.parse(message.data);\n    if (isCrxHMRPayload(payload)) {\n      if (payload.event === \"crx:runtime-reload\") {\n        console.log(\"[crx] runtime reload\");\n        setTimeout(() => location.reload(), 500);\n      } else {\n        forward(JSON.stringify(payload.data));\n      }\n    } else {\n      forward(message.data);\n    }\n  };\n  addEventListener = (event, callback) => {\n    const cbs = this.callbacks.get(event) ?? /* @__PURE__ */ new Set();\n    cbs.add(callback);\n    this.callbacks.set(event, cbs);\n  };\n  send = (data) => {\n    if (this.port)\n      this.port.postMessage({ data });\n    else\n      throw new Error(\"HMRPort is not initialized\");\n  };\n}\n\nexport { HMRPort };\n";

var contentDevLoader = "(function () {\n  'use strict';\n\n  const injectTime = performance.now();\n  (async () => {\n    if (__PREAMBLE__)\n      await import(\n        /* @vite-ignore */\n        chrome.runtime.getURL(__PREAMBLE__)\n      );\n    await import(\n      /* @vite-ignore */\n      chrome.runtime.getURL(__CLIENT__)\n    );\n    const { onExecute } = await import(\n      /* @vite-ignore */\n      chrome.runtime.getURL(__SCRIPT__)\n    );\n    onExecute?.({ perf: { injectTime, loadTime: performance.now() - injectTime } });\n  })().catch(console.error);\n\n})();\n";

var contentProLoader = "(function () {\n  'use strict';\n\n  const injectTime = performance.now();\n  (async () => {\n    const { onExecute } = await import(\n      /* @vite-ignore */\n      chrome.runtime.getURL(__SCRIPT__)\n    );\n    onExecute?.({ perf: { injectTime, loadTime: performance.now() - injectTime } });\n  })().catch(console.error);\n\n})();\n";

const contentScripts = new RxMap();
contentScripts.change$.pipe(filter(RxMap.isChangeType.set)).subscribe(({ map, value }) => {
  const keyNames = [
    "refId",
    "id",
    "fileName",
    "loaderName",
    "resolvedId",
    "scriptId"
  ];
  for (const keyName of keyNames) {
    const key = value[keyName];
    if (typeof key === "undefined" || map.has(key)) {
      continue;
    } else {
      map.set(key, value);
    }
  }
});
function hashScriptId(script) {
  return hash(`${script.type}&${script.id}`);
}
function createDevLoader({
  preamble,
  client,
  fileName
}) {
  return contentDevLoader.replace(/__PREAMBLE__/g, JSON.stringify(preamble)).replace(/__CLIENT__/g, JSON.stringify(client)).replace(/__SCRIPT__/g, JSON.stringify(fileName)).replace(/__TIMESTAMP__/g, JSON.stringify(Date.now()));
}
function createProLoader({ fileName }) {
  return contentProLoader.replace(/__SCRIPT__/g, JSON.stringify(fileName));
}

const serverEvent$ = new ReplaySubject(1);
const close$ = serverEvent$.pipe(
  filter((e) => e.type === "close"),
  switchMap((e) => of(e))
);
const start$ = serverEvent$.pipe(
  filter((e) => e.type === "start"),
  switchMap((e) => of(e))
);
const fileWriterEvent$ = new ReplaySubject(1);
const buildEnd$ = fileWriterEvent$.pipe(
  filter((e) => e.type === "build_end"),
  switchMap((e) => of(e))
);
fileWriterEvent$.pipe(
  filter((e) => e.type === "build_start"),
  switchMap((e) => of(e))
);
const allFilesReady$ = buildEnd$.pipe(
  switchMap(() => outputFiles.change$.pipe(startWith({ type: "start" }))),
  map(() => [...outputFiles.values()]),
  switchMap((files) => Promise.allSettled(files.map(({ file }) => file)))
);
const timestamp$ = new BehaviorSubject(Date.now());
allFilesReady$.subscribe(() => {
  timestamp$.next(Date.now());
});
const isRejected = (x) => x?.status === "rejected";
const fileWriterError$ = allFilesReady$.pipe(
  mergeMap((results) => results.filter(isRejected)),
  map((rejected) => ({ err: rejected.reason, type: "error" }))
);
firstValueFrom(
  fileWriterError$.pipe(
    takeUntil(serverEvent$.pipe(first(({ type }) => type === "close"))),
    toArray()
  )
);
function prepFileData(fileId) {
  const fileName = getFileName(fileId);
  if (fileId.type === "asset") {
    return prepAsset(fileName, fileId);
  } else {
    return prepScript(fileName, fileId);
  }
}
function prepAsset(fileName, { id, source }) {
  return ($) => $.pipe(
    mergeMap(async ({ server }) => {
      const target = getOutputPath(server, fileName);
      return {
        target,
        source: source ?? await readFile$1(join(server.config.root, id)),
        deps: []
      };
    })
  );
}
function prepScript(fileName, script) {
  return ($) => $.pipe(
    // get script contents from dev server
    mergeMap(async ({ server }) => {
      const target = getOutputPath(server, fileName);
      const viteUrl = getViteUrl(script);
      const transformResult = await server.transformRequest(viteUrl);
      if (!transformResult)
        throw new TypeError(`Unable to load "${script.id}" from server.`);
      const { deps = [], dynamicDeps = [], map: map2 } = transformResult;
      let { code } = transformResult;
      try {
        if (map2 && server.config.build.sourcemap === "inline") {
          code = code.replace(/\n*\/\/# sourceMappingURL=[^\n]+/g, "");
          const sourceMap = convertSourceMap.fromObject(map2).toComment();
          code += `
${sourceMap}
`;
        }
      } catch (error) {
        console.warn("Failed to inline source map", error);
      }
      return {
        target,
        code,
        deps: [...deps, ...dynamicDeps].flat(),
        server
      };
    }),
    // retry in case of dependency rebundle
    retry({ count: 10, delay: 100 }),
    // patch content scripts
    mergeMap(async ({ target, server, ...rest }) => {
      const plugins = server.config.plugins;
      let { code, deps } = rest;
      for (const plugin of plugins) {
        const r = await plugin.renderCrxDevScript?.(code, script);
        if (typeof r === "string")
          code = r;
      }
      return { target, code, deps };
    }),
    mergeMap(async ({ target, code, deps }) => {
      await lexer.init;
      const [imports] = lexer.parse(code, fileName);
      const depSet = new Set(deps);
      const magic = new MagicString(code);
      for (const i of imports)
        if (i.n) {
          depSet.add(i.n);
          const fileName2 = getFileName({ type: "module", id: i.n });
          const fullImport = code.substring(i.s, i.e);
          magic.overwrite(i.s, i.e, fullImport.replace(i.n, `/${fileName2}`));
        }
      return { target, source: magic.toString(), deps: [...depSet] };
    })
  );
}
async function allFilesReady() {
  await firstValueFrom(allFilesReady$);
}

const { outputFile } = fsx;
_debug("file-writer");
async function start({
  server
}) {
  serverEvent$.next({ type: "start", server });
  const plugins = server.config.plugins.filter(
    (p) => p.name?.startsWith("crx:")
  );
  const { rollupOptions, outDir } = server.config.build;
  const inputOptions = {
    input: "index.html",
    ...rollupOptions,
    plugins
  };
  const rollupOutputOptions = [rollupOptions.output].flat()[0];
  const outputOptions = {
    ...rollupOutputOptions,
    dir: outDir,
    format: "es"
  };
  fileWriterEvent$.next({ type: "build_start" });
  const build = await rollup(inputOptions);
  await build.write(outputOptions);
  fileWriterEvent$.next({ type: "build_end" });
  await allFilesReady();
}
async function close() {
  serverEvent$.next({ type: "close" });
}
function add(script) {
  const fileName = getFileName(script);
  let file = outputFiles.get(fileName);
  if (typeof file === "undefined") {
    file = formatFileData({
      ...script,
      fileName,
      file: write(script)
    });
    outputFiles.set(file.fileName, file);
  }
  return file;
}
function update(_id) {
  const id = prefix$1("/", _id);
  const types = ["iife", "module"];
  const updatedFiles = [];
  for (const type of types) {
    const fileName = getFileName({ id, type });
    const scriptFile = outputFiles.get(fileName);
    if (scriptFile) {
      scriptFile.file = write({ id, type });
      updatedFiles.push(scriptFile);
      outputFiles.set(fileName, scriptFile);
    }
  }
  return updatedFiles;
}
async function write(fileId) {
  const start2 = performance.now();
  const deps = await firstValueFrom(
    // wait for start event
    start$.pipe(
      // prepare either asset or script contents
      prepFileData(fileId),
      // output file and add dependencies to file writer
      mergeMap(async ({ target, source, deps: deps2 }) => {
        const files = deps2.map((id) => {
          const r = [add({ id, type: "module" })];
          if (id.includes("?import")) {
            const [imported] = id.split("?import");
            r.push(add({ id: imported, type: "asset" }));
          }
          return r;
        }).flat();
        if (source instanceof Uint8Array)
          await outputFile(target, source);
        else
          await outputFile(target, source, { encoding: "utf8" });
        return files;
      }),
      // abort write operation on close event
      takeUntil(close$),
      concatWith(of([]))
    )
  );
  const close2 = performance.now();
  return { start: start2, close: close2, deps };
}

const pluginContentScripts = () => {
  let server;
  let preambleCode;
  let hmrTimeout;
  let sub = new Subscription();
  return [
    {
      name: "crx:content-scripts",
      apply: "serve",
      async config(config) {
        const { contentScripts: contentScripts2 = {} } = await getOptions(config);
        hmrTimeout = contentScripts2.hmrTimeout ?? 5e3;
        preambleCode = preambleCode ?? contentScripts2.preambleCode;
      },
      async configureServer(_server) {
        server = _server;
        if (typeof preambleCode === "undefined" && server.config.plugins.some(
          ({ name = "none" }) => name.toLowerCase().includes("react") && !name.toLowerCase().includes("preact")
        )) {
          try {
            const react = await import('@vitejs/plugin-react');
            preambleCode = react.default.preambleCode;
          } catch (error) {
            preambleCode = false;
          }
        }
        sub.add(
          contentScripts.change$.pipe(filter(RxMap.isChangeType.set)).subscribe(({ value: script }) => {
            const { type, id } = script;
            if (type === "loader") {
              let preamble = { fileName: "" };
              if (preambleCode)
                preamble = add({ type: "module", id: preambleId });
              const client = add({ type: "module", id: viteClientId });
              const file = add({ type: "module", id });
              const loader = add({
                type: "asset",
                id: getFileName({ type: "loader", id }),
                source: createDevLoader({
                  preamble: preamble.fileName,
                  client: client.fileName,
                  fileName: file.fileName
                })
              });
              script.fileName = loader.fileName;
            } else if (type === "iife") {
              throw new Error("IIFE content scripts are not implemented");
            } else {
              const file = add({ type: "module", id });
              script.fileName = file.fileName;
            }
          })
        );
      },
      resolveId(source) {
        if (source === preambleId)
          return preambleId;
        if (source === contentHmrPortId)
          return contentHmrPortId;
      },
      load(id) {
        if (id === preambleId && typeof preambleCode === "string") {
          const defined = preambleCode.replace(/__BASE__/g, server.config.base);
          return defined;
        }
        if (id === contentHmrPortId) {
          const defined = contentHmrPort.replace(
            "__CRX_HMR_TIMEOUT__",
            JSON.stringify(hmrTimeout)
          );
          return defined;
        }
      },
      closeBundle() {
        sub.unsubscribe();
        sub = new Subscription();
      }
    },
    {
      name: "crx:content-scripts",
      apply: "build",
      enforce: "pre",
      config(config) {
        return {
          ...config,
          build: {
            ...config.build,
            rollupOptions: {
              ...config.build?.rollupOptions,
              // keep exports for content script module api
              preserveEntrySignatures: config.build?.rollupOptions?.preserveEntrySignatures ?? "exports-only"
            }
          }
        };
      },
      generateBundle() {
        for (const [key, script] of contentScripts)
          if (key === script.refId) {
            if (script.type === "module") {
              const fileName = this.getFileName(script.refId);
              script.fileName = fileName;
            } else if (script.type === "loader") {
              const fileName = this.getFileName(script.refId);
              script.fileName = fileName;
              const refId = this.emitFile({
                type: "asset",
                name: getFileName({ type: "loader", id: basename(script.id) }),
                source: createProLoader({ fileName })
              });
              script.loaderName = this.getFileName(refId);
            } else if (script.type === "iife") {
              throw new Error("IIFE content scripts are not implemented");
            }
            contentScripts.set(script.refId, formatFileData(script));
          }
      }
    }
  ];
};

const pluginContentScriptsCss = () => {
  let injectCss;
  return {
    name: "crx:content-scripts-css",
    enforce: "post",
    async config(config) {
      const { contentScripts: contentScripts2 = {} } = await getOptions(config);
      injectCss = contentScripts2.injectCss ?? true;
    },
    renderCrxManifest(manifest) {
      if (injectCss) {
        if (manifest.content_scripts) {
          for (const script of manifest.content_scripts)
            if (script.js)
              for (const fileName of script.js)
                if (contentScripts.has(fileName)) {
                  const { css } = contentScripts.get(fileName);
                  if (css?.length)
                    script.css = [script.css ?? [], css].flat();
                } else {
                  throw new Error(
                    `Content script is undefined by fileName: ${fileName}`
                  );
                }
        }
      }
      return manifest;
    }
  };
};

const pluginDeclaredContentScripts = () => {
  return [];
};

const _dynamicScriptRegEx = /\b(import.meta).CRX_DYNAMIC_SCRIPT_(.+?)[,;]/gm;
const dynamicScriptRegEx = () => {
  _dynamicScriptRegEx.lastIndex = 0;
  return _dynamicScriptRegEx;
};
const pluginDynamicContentScripts = () => {
  let config;
  return [
    {
      name: "crx:dynamic-content-scripts-loader",
      enforce: "pre",
      configResolved(_config) {
        config = _config;
      },
      configureServer(server) {
        return () => {
          server.middlewares.use(async (req, res, next) => {
            try {
              await allFilesReady();
              next();
            } catch (error) {
              let err;
              if (error instanceof Error) {
                err = error;
              } else if (typeof error === "string") {
                err = new Error(error);
              } else {
                err = new Error(
                  `Unexpected error "${error}" in middleware for "${req.url}"`
                );
              }
              server.ws.send({
                type: "error",
                err: {
                  message: err.message,
                  stack: err.stack ?? "no stack available"
                }
              });
            }
          });
        };
      },
      async resolveId(_source, importer) {
        if (importer && _source.includes("?script")) {
          const url = new URL(_source, "stub://stub");
          if (url.searchParams.has("script")) {
            const [source] = _source.split("?");
            const resolved = await this.resolve(source, importer, {
              skipSelf: true
            });
            if (!resolved)
              throw new Error(
                `Could not resolve dynamic script: "${_source}" from "${importer}"`
              );
            const { id } = resolved;
            let type = "loader";
            if (url.searchParams.has("module")) {
              type = "module";
            } else if (url.searchParams.has("iife")) {
              type = "iife";
            }
            const scriptId = hashScriptId({ type, id });
            const resolvedId = `${id}?scriptId=${scriptId}`;
            let script = contentScripts.get(resolvedId);
            if (typeof script === "undefined") {
              let refId;
              let fileName;
              let loaderName;
              if (config.command === "build") {
                refId = this.emitFile({
                  type: "chunk",
                  id,
                  name: basename(id)
                });
              } else {
                refId = scriptId;
                const relId = relative(config.root, id);
                fileName = getFileName({
                  type: type === "iife" ? "iife" : "module",
                  id: relId
                });
                if (type === "loader")
                  loaderName = getFileName({ type, id: relId });
              }
              script = formatFileData({
                type,
                id: relative(config.root, id),
                isDynamicScript: true,
                fileName,
                loaderName,
                refId,
                scriptId,
                matches: []
              });
              contentScripts.set(script.id, script);
            }
            return resolvedId;
          } else if (url.searchParams.has("scriptId")) {
            return _source;
          }
        }
      },
      async load(id) {
        const index = id.indexOf("?scriptId=");
        if (index > -1) {
          const scriptId = id.slice(index + "?scriptId=".length);
          const script = contentScripts.get(scriptId);
          if (config.command === "build") {
            return `export default import.meta.CRX_DYNAMIC_SCRIPT_${script.refId};`;
          } else if (typeof script.fileName === "string") {
            return `export default ${JSON.stringify(script.fileName)};`;
          } else {
            throw new Error(
              `Content script fileName is undefined: "${script.id}"`
            );
          }
        }
      }
    },
    {
      name: "crx:dynamic-content-scripts-build",
      apply: "build",
      /**
       * Replace dynamic script placeholders during build.
       *
       * Can't use `renderChunk` b/c pre plugin crx:content-scripts uses
       * `generateBundle` to emit loaders. Must come after "enforce: pre".
       */
      generateBundle(options, bundle) {
        for (const chunk of Object.values(bundle))
          if (chunk.type === "chunk") {
            if (dynamicScriptRegEx().test(chunk.code)) {
              const replaced = chunk.code.replace(
                dynamicScriptRegEx(),
                (match, p1, scriptKey) => {
                  const script = contentScripts.get(scriptKey);
                  if (typeof script === "undefined")
                    throw new Error(
                      `Content script refId is undefined: "${match}"`
                    );
                  if (typeof script.fileName === "undefined")
                    throw new Error(
                      `Content script fileName is undefined: "${script.id}"`
                    );
                  return `${JSON.stringify(
                    `/${script.loaderName ?? script.fileName}`
                  )}${match.split(scriptKey)[1]}`;
                }
              );
              chunk.code = replaced;
            }
          }
      }
    }
  ];
};

const { remove } = fsx;
const logger = createLogger("error", { prefix: "crxjs" });
const pluginFileWriter = () => {
  fileWriterError$.subscribe((error) => {
    logger.error(error.err.message, { error: error.err });
  });
  return [
    {
      name: "crx:file-writer-empty-out-dir",
      apply: "serve",
      enforce: "pre",
      async configResolved(config) {
        if (config.build.emptyOutDir) {
          await remove(config.build.outDir);
        }
      }
    },
    {
      name: "crx:file-writer",
      apply: "serve",
      configureServer(server) {
        server.httpServer?.on("listening", async () => {
          try {
            await start({ server });
          } catch (error) {
            console.error(error);
            server.close();
          }
        });
        server.httpServer?.on("close", () => close());
      },
      closeBundle() {
        outputFiles.clear();
      }
    }
  ];
};

const _require = typeof require === "undefined" ? createRequire(import.meta.url) : require;
const customElementsPath = _require.resolve(customElementsId.slice(1));
const customElementsCode = readFileSync(customElementsPath, "utf8");
const customElementsMap = readFileSync(`${customElementsPath}.map`, "utf8");
const pluginFileWriterPolyfill = () => {
  return {
    name: "crx:file-writer-polyfill",
    apply: "serve",
    enforce: "pre",
    resolveId(source) {
      if (source === customElementsId) {
        return customElementsId;
      }
    },
    load(id) {
      if (id === customElementsId) {
        return { code: customElementsCode, map: customElementsMap };
      }
    },
    renderCrxDevScript(code, { type, id }) {
      if (type === "module" && id === viteClientId) {
        const magic = new MagicString(code);
        magic.prepend(`import '${customElementsId}';`);
        magic.prepend(`import { HMRPort } from '${contentHmrPortId}';`);
        const ws = "new WebSocket";
        const index = code.indexOf(ws);
        magic.overwrite(index, index + ws.length, "new HMRPort");
        return magic.toString();
      }
    }
  };
};

async function manifestFiles(manifest, options = {}) {
  let locales = [];
  if (manifest.default_locale)
    locales = await fg("_locales/**/messages.json", options);
  const rulesets = manifest.declarative_net_request?.rule_resources.flatMap(
    ({ path }) => path
  ) ?? [];
  const contentScripts = manifest.content_scripts?.flatMap(({ js }) => js) ?? [];
  const contentStyles = manifest.content_scripts?.flatMap(({ css }) => css);
  const serviceWorker = manifest.background?.service_worker;
  const htmlPages = htmlFiles(manifest);
  const icons = [
    Object.values(
      isString(manifest.icons) ? [manifest.icons] : manifest.icons ?? {}
    ),
    Object.values(
      isString(manifest.action?.default_icon) ? [manifest.action?.default_icon] : manifest.action?.default_icon ?? {}
    )
  ].flat();
  let webAccessibleResources = [];
  if (manifest.web_accessible_resources) {
    const resources = await Promise.all(
      manifest.web_accessible_resources.flatMap(({ resources: resources2 }) => resources2).map(async (r) => {
        if (["*", "**/*"].includes(r))
          return void 0;
        if (fg.isDynamicPattern(r))
          return fg(r, options);
        return r;
      })
    );
    webAccessibleResources = [...new Set(resources.flat())].filter(isString);
  }
  return {
    contentScripts: [...new Set(contentScripts)].filter(isString),
    contentStyles: [...new Set(contentStyles)].filter(isString),
    html: htmlPages,
    icons: [...new Set(icons)].filter(isString),
    locales: [...new Set(locales)].filter(isString),
    rulesets: [...new Set(rulesets)].filter(isString),
    background: [serviceWorker].filter(isString),
    webAccessibleResources
  };
}
async function dirFiles(dir) {
  const files = await fg(`${dir}/**/*`);
  return files;
}
function htmlFiles(manifest) {
  const files = [
    manifest.action?.default_popup,
    Object.values(manifest.chrome_url_overrides ?? {}),
    manifest.devtools_page,
    manifest.options_page,
    manifest.options_ui?.page,
    manifest.sandbox?.pages,
    manifest.side_panel?.default_path
  ].flat().filter(isString).map((s) => s.split(/[#?]/)[0]).sort();
  return [...new Set(files)];
}

const pluginFileWriterPublic = () => {
  let config;
  return {
    name: "crx:file-writer-public",
    apply: "serve",
    configResolved(_config) {
      config = _config;
    },
    async generateBundle() {
      const publicDir = isAbsolute(config.publicDir) ? config.publicDir : resolve(config.root, config.publicDir);
      const files = await dirFiles(publicDir);
      for (const filepath of files) {
        const source = await readFile$1(filepath);
        const fileName = relative(publicDir, filepath);
        this.emitFile({ type: "asset", source, fileName });
      }
    }
  };
};

const debug$2 = _debug("file-writer").extend("hmr");
const isCustomPayload = (p) => {
  return p.type === "custom";
};
const hmrPayload$ = new Subject();
const crxHMRPayload$ = hmrPayload$.pipe(
  filter((p) => !isCustomPayload(p)),
  buffer(allFilesReady$),
  mergeMap((pps) => {
    let fullReload;
    const payloads = [];
    for (const p of pps)
      if (p.type === "full-reload") {
        fullReload = p;
      } else {
        payloads.push(p);
      }
    if (fullReload)
      payloads.push(fullReload);
    return payloads;
  }),
  map((p) => {
    switch (p.type) {
      case "full-reload": {
        const fullReload = {
          type: "full-reload",
          path: p.path && getViteUrl({ id: p.path, type: "module" })
        };
        return fullReload;
      }
      case "prune": {
        const prune = {
          type: "prune",
          paths: p.paths.map((id) => getViteUrl({ id, type: "module" }))
        };
        return prune;
      }
      case "update": {
        const update = {
          type: "update",
          updates: p.updates.map(({ acceptedPath: ap, path: p2, ...rest }) => ({
            ...rest,
            acceptedPath: prefix$1("/", getFileName({ id: ap, type: "module" })),
            path: prefix$1("/", getFileName({ id: p2, type: "module" }))
          }))
        };
        return update;
      }
      default:
        return p;
    }
  }),
  filter((p) => {
    switch (p.type) {
      case "full-reload":
        return typeof p.path === "undefined";
      case "prune":
        return p.paths.length > 0;
      case "update":
        return p.updates.length > 0;
      default:
        return true;
    }
  }),
  map((data) => {
    debug$2(`hmr payload`, data);
    return {
      type: "custom",
      event: "crx:content-script-payload",
      data
    };
  })
);

function isImporter(file) {
  const seen = /* @__PURE__ */ new Set();
  const pred = (changedNode) => {
    seen.add(changedNode);
    if (changedNode.file === file)
      return true;
    for (const parentNode of changedNode.importers) {
      const unseen = !seen.has(parentNode);
      if (unseen && pred(parentNode))
        return true;
    }
    return false;
  };
  return pred;
}

const debug$1 = _debug("hmr");
const crxRuntimeReload = {
  type: "custom",
  event: "crx:runtime-reload"
};
const pluginHMR = () => {
  let inputManifestFiles;
  let decoratedSend;
  let config;
  let subs;
  return [
    {
      name: "crx:hmr",
      apply: "serve",
      enforce: "pre",
      // server hmr host should be localhost
      async config({ server = {}, ...config2 }) {
        if (server.hmr === false)
          return;
        if (server.hmr === true)
          server.hmr = {};
        server.hmr = server.hmr ?? {};
        server.hmr.host = "localhost";
        return { server, ...config2 };
      },
      // server should ignore outdir
      configResolved(_config) {
        config = _config;
        const { watch = {} } = config.server;
        config.server.watch = watch;
        watch.ignored = watch.ignored ? [...new Set([watch.ignored].flat())] : [];
        const outDir = isAbsolute(config.build.outDir) ? config.build.outDir : join(config.root, config.build.outDir, "**/*");
        if (!watch.ignored.includes(outDir))
          watch.ignored.push(outDir);
      },
      configureServer(server) {
        if (server.ws.send !== decoratedSend) {
          const { send } = server.ws;
          decoratedSend = (payload) => {
            if (payload.type === "error") {
              send({
                type: "custom",
                event: "crx:content-script-payload",
                data: payload
              });
            } else {
              hmrPayload$.next(payload);
            }
            send(payload);
          };
          server.ws.send = decoratedSend;
          subs = new Subscription(() => subs = new Subscription());
          subs.add(fileWriterError$.subscribe(send));
          subs.add(
            crxHMRPayload$.subscribe((payload) => {
              send(payload);
            })
          );
        }
      },
      closeBundle() {
        subs.unsubscribe();
      },
      // background changes require a full extension reload
      handleHotUpdate({ modules, server }) {
        const { root } = server.config;
        const relFiles = /* @__PURE__ */ new Set();
        for (const m of modules)
          if (m.id?.startsWith(root)) {
            relFiles.add(m.id.slice(server.config.root.length));
          }
        if (inputManifestFiles.background.length) {
          const background = prefix$1("/", inputManifestFiles.background[0]);
          if (relFiles.has(background) || modules.some(isImporter(join(server.config.root, background)))) {
            debug$1("sending runtime reload");
            server.ws.send(crxRuntimeReload);
            return [];
          }
        }
        for (const [key, script] of contentScripts)
          if (key === script.id) {
            if (relFiles.has(script.id) || modules.some(isImporter(join(server.config.root, script.id)))) {
              relFiles.forEach((relFile) => update(relFile));
            }
          }
      }
    },
    {
      name: "crx:hmr",
      apply: "serve",
      enforce: "post",
      // get final output manifest for handleHotUpdate 👆
      async transformCrxManifest(manifest) {
        inputManifestFiles = await manifestFiles(manifest, { cwd: config.root });
        return null;
      },
      renderCrxDevScript(code, { id: _id, type }) {
        if (type === "module" && _id !== "/@vite/client" && code.includes("createHotContext")) {
          const id = _id.replace(/t=\d+&/, "");
          const escaped = id.replace(/([?&.])/g, "\\$1");
          const regexp = new RegExp(
            `(?<=createHotContext\\(")${escaped}(?="\\))`
          );
          const fileUrl = prefix$1("/", getFileName({ id, type }));
          const replaced = code.replace(regexp, fileUrl);
          return replaced;
        } else {
          return code;
        }
      }
    }
  ];
};

var loader = "try {\n  for (const p of JSON.parse(SCRIPTS)) {\n    const url = new URL(p, \"https://stub\");\n    url.searchParams.set(\"t\", Date.now().toString());\n    const req = url.pathname + url.search;\n    await import(\n      /* @vite-ignore */\n      req\n    );\n  }\n} catch (error) {\n  console.error(error);\n}\n";

const pluginName = "crx:html-inline-scripts";
const debug = _debug(pluginName);
const prefix = "@crx/inline-script";
const isInlineTag = (t) => t.tag === "script" && !t.attrs?.src;
const toKey = (ctx) => {
  const { dir, name } = parse(ctx.path);
  return join(prefix, dir, name);
};
const pluginHtmlInlineScripts = () => {
  const pages = /* @__PURE__ */ new Map();
  const auditTransformIndexHtml = (p) => {
    let transform;
    if (typeof p.transformIndexHtml === "function") {
      transform = p.transformIndexHtml;
      p.transformIndexHtml = auditor;
    } else if (typeof p.transformIndexHtml === "object") {
      transform = p.transformIndexHtml.transform;
      p.transformIndexHtml.transform = auditor;
    }
    async function auditor(_html, ctx) {
      const result = await transform(_html, ctx);
      if (!result || typeof result === "string")
        return result;
      let html;
      let tags;
      if (Array.isArray(result)) {
        tags = new Set(result);
      } else {
        tags = new Set(result.tags);
        html = result.html;
      }
      const scripts = [];
      for (const t of tags)
        if (t.tag === "script") {
          tags.delete(t);
          scripts.push(t);
        }
      const key = toKey(ctx);
      const page = pages.get(key);
      page.scripts.push(...scripts);
      pages.set(key, page);
      return html ? { html, tags: [...tags] } : [...tags];
    }
  };
  let base;
  const prePlugin = {
    name: "crx:html-auditor-pre",
    transformIndexHtml(html, ctx) {
      const key = toKey(ctx);
      pages.set(key, {
        ...ctx,
        scripts: [
          {
            tag: "script",
            attrs: {
              type: "module",
              src: join(base, "@vite/client")
            },
            injectTo: "head-prepend"
          }
        ]
      });
    }
  };
  const postPlugin = {
    name: "crx:html-auditor-post",
    // this hook isn't audited b/c we add it after we set up the auditors
    transformIndexHtml(html, ctx) {
      const key = toKey(ctx);
      const p = pages.get(key);
      if (p?.scripts.some(isInlineTag)) {
        const $ = load(html);
        p.scripts.push(
          ...$("script").toArray().map((el) => ({
            tag: "script",
            attrs: { src: $(el).attr("src"), type: "module" }
          }))
        );
        $("script").remove();
        const loader2 = {
          tag: "script",
          attrs: { src: `${key}?t=${Date.now()}`, type: "module" }
        };
        return { html: $.html(), tags: [loader2] };
      }
      return p?.scripts ?? void 0;
    }
  };
  return {
    name: "crx:html-auditor",
    apply: "serve",
    configResolved(config) {
      base = config.base;
      const plugins = config.plugins;
      for (const p of plugins)
        auditTransformIndexHtml(p);
      plugins.unshift(prePlugin);
      plugins.push(postPlugin);
    },
    configureServer(server) {
      const { transformIndexHtml } = server;
      server.transformIndexHtml = async function auditor(url, html, originalUrl) {
        let result = await transformIndexHtml(url, html, originalUrl);
        if (result.includes(prefix))
          result = result.replace(/\s+<script.+?@vite\/client.+?script>/, "");
        return result;
      };
    },
    resolveId(source) {
      const i = source.indexOf(prefix);
      if (i > -1)
        return source.slice(i);
    },
    load(id) {
      if (id.startsWith(prefix)) {
        const page = pages.get(id);
        if (page) {
          const inline = page.scripts.filter(isInlineTag).map((t) => t.children).join("\n");
          const dir = dirname(page.path);
          const scripts = page.scripts.map(({ attrs }) => attrs?.src).filter(isString).filter((src) => src !== "/@vite/client").map((src) => src.startsWith(".") ? resolve(dir, src) : src);
          const json = `"${jsesc(JSON.stringify(scripts), {
            quotes: "double"
          })}"`;
          return [inline, loader.replace("SCRIPTS", json)].join("\n");
        } else {
          debug("page missing %s", id);
        }
      }
    }
  };
};

var precontrollerJs = "const id = setInterval(() => location.reload(), 100);\nsetTimeout(() => clearInterval(id), 5e3);\n";

var precontrollerHtml = "<!DOCTYPE html>\n<html lang=\"en\">\n  <head>\n    <title>Waiting for the extension service worker...</title>\n    <script src=\"%SCRIPT%\"></script>\n  </head>\n  <body>\n    <h1>Waiting for service worker</h1>\n\n    <p>\n      If you see this message, it means the service worker has not loaded fully.\n    </p>\n\n    <p>This page is never added in production.</p>\n  </body>\n</html>\n";

const { readFile } = promises;
const pluginManifest = () => {
  let manifest;
  let plugins;
  let refId;
  let config;
  return [
    {
      name: "crx:manifest-init",
      enforce: "pre",
      async config(config2, env) {
        const { manifest: _manifest } = await getOptions(config2);
        manifest = await (typeof _manifest === "function" ? _manifest(env) : _manifest);
        if (manifest.manifest_version !== 3)
          throw new Error(
            `CRXJS does not support Manifest v${manifest.manifest_version}, please use Manifest v3`
          );
        if (env.command === "serve") {
          const {
            contentScripts: js,
            background: sw,
            html
          } = await manifestFiles(manifest, { cwd: config2.root });
          const { entries = [] } = config2.optimizeDeps ?? {};
          let { input = [] } = config2.build?.rollupOptions ?? {};
          if (typeof input === "string")
            input = [input];
          else
            input = Object.values(input);
          input = input.map((f) => {
            let result = f;
            if (isAbsolute(f)) {
              result = relative(config2.root ?? process.cwd(), f);
            }
            return result;
          });
          const set = new Set([entries, input].flat());
          for (const x of [js, sw, html].flat())
            set.add(x);
          return {
            ...config2,
            optimizeDeps: {
              ...config2.optimizeDeps,
              entries: [...set]
            }
          };
        }
      },
      buildStart(options) {
        if (options.plugins)
          plugins = options.plugins;
      }
    },
    {
      name: "crx:manifest-loader",
      enforce: "pre",
      buildStart(options) {
        if (typeof options.input !== "undefined" && !("ssr" in this)) {
          refId = this.emitFile({
            type: "chunk",
            id: manifestId,
            name: "crx-manifest.js",
            preserveSignature: "strict"
          });
        }
      },
      resolveId(source) {
        if (source === manifestId)
          return manifestId;
        return null;
      },
      load(id) {
        if (id === manifestId)
          return encodeManifest(manifest);
        return null;
      }
    },
    {
      name: "crx:stub-input",
      enforce: "pre",
      options({ input, ...options }) {
        let finalInput = input;
        if (isString(input) && input.endsWith("index.html")) {
          finalInput = stubId;
        }
        if (config.command === "serve") {
          if (Array.isArray(input)) {
            finalInput = input.filter((x) => !x.endsWith(".html"));
          } else if (typeof input === "object") {
            for (const [key, value] of Object.entries(input))
              if (value.endsWith(".html"))
                delete input[key];
          }
        }
        return { input: finalInput, ...options };
      },
      resolveId(source) {
        if (source === stubId)
          return stubId;
        return null;
      },
      load(id) {
        if (id === stubId)
          return `console.log('stub')`;
        return null;
      },
      generateBundle(options, bundle) {
        for (const [key, chunk] of Object.entries(bundle)) {
          if (chunk.type === "chunk" && chunk.facadeModuleId === stubId) {
            delete bundle[key];
            break;
          }
        }
      }
    },
    {
      name: "crx:manifest-post",
      enforce: "post",
      configResolved(_config) {
        config = _config;
        const plugins2 = config.plugins;
        const crx = plugins2.findIndex(
          ({ name }) => name === "crx:manifest-post"
        );
        const [plugin] = plugins2.splice(crx, 1);
        plugins2.push(plugin);
      },
      async transform(code, id) {
        if (id !== manifestId)
          return;
        let manifest2 = decodeManifest.call(this, code);
        for (const plugin of plugins) {
          try {
            const m = structuredClone(manifest2);
            const result = await plugin.transformCrxManifest?.call(this, m);
            manifest2 = result ?? manifest2;
          } catch (error) {
            if (error instanceof Error)
              error.message = `[${plugin.name}] ${error.message}`;
            throw error;
          }
        }
        if (config.command === "serve") {
          if (manifest2.content_scripts)
            for (const { js = [], matches = [] } of manifest2.content_scripts)
              for (const id2 of js) {
                contentScripts.set(
                  prefix$1("/", id2),
                  formatFileData({
                    type: "loader",
                    id: id2,
                    matches,
                    refId: hashScriptId({ type: "loader", id: id2 }),
                    fileName: getFileName({ type: "loader", id: id2 })
                  })
                );
              }
        } else {
          if (manifest2.content_scripts)
            for (const { js = [], matches = [] } of manifest2.content_scripts)
              for (const file of js) {
                const id2 = join(config.root, file);
                const refId2 = this.emitFile({
                  type: "chunk",
                  id: id2,
                  name: basename(file)
                });
                contentScripts.set(
                  file,
                  formatFileData({
                    type: "loader",
                    id: file,
                    refId: refId2,
                    matches
                  })
                );
              }
          if (manifest2.background?.service_worker) {
            const file = manifest2.background.service_worker;
            const id2 = join(config.root, file);
            const refId2 = this.emitFile({
              type: "chunk",
              id: id2,
              name: basename(file)
            });
            manifest2.background.service_worker = refId2;
          }
          for (const file of htmlFiles(manifest2)) {
            const id2 = join(config.root, file);
            this.emitFile({
              type: "chunk",
              id: id2,
              name: basename(file)
            });
          }
        }
        const encoded = encodeManifest(manifest2);
        return { code: encoded, map: null };
      },
      async generateBundle(options, bundle) {
        const manifestName = this.getFileName(refId);
        const manifestJs = bundle[manifestName];
        let manifest2 = decodeManifest.call(this, manifestJs.code);
        if (config.command === "serve") {
          if (manifest2.content_scripts)
            for (const script of manifest2.content_scripts) {
              script.js = script.js?.map(
                (id) => getFileName({ id, type: "loader" })
              );
            }
        } else {
          if (manifest2.background?.service_worker) {
            const ref = manifest2.background.service_worker;
            const name = this.getFileName(ref);
            manifest2.background.service_worker = name;
          }
          manifest2.content_scripts = manifest2.content_scripts?.map(
            ({ js = [], ...rest }) => {
              return {
                js: js.map((id) => {
                  const script = contentScripts.get(id);
                  const fileName = script?.loaderName ?? script?.fileName;
                  if (typeof fileName === "undefined")
                    throw new Error(
                      `Content script fileName is undefined: "${id}"`
                    );
                  return fileName;
                }),
                ...rest
              };
            }
          );
        }
        for (const plugin of plugins) {
          try {
            const m = structuredClone(manifest2);
            const result = await plugin.renderCrxManifest?.call(this, m, bundle);
            manifest2 = result ?? manifest2;
          } catch (error) {
            const name = `[${plugin.name}]`;
            let message = error;
            if (error instanceof Error) {
              message = colors.red(
                `${name} ${error.stack ? error.stack : error.message}`
              );
            } else if (typeof error === "string") {
              message = colors.red(`${name} ${error}`);
            }
            console.log(message);
            throw new Error(`Error in ${plugin.name}.renderCrxManifest`);
          }
        }
        const assetTypes = [
          "icons",
          "locales",
          "rulesets",
          "webAccessibleResources"
        ];
        const files = await manifestFiles(manifest2, { cwd: config.root });
        await Promise.all(
          assetTypes.map((k) => files[k]).flat().map(async (f) => {
            if (typeof bundle[f] === "undefined") {
              let filename = join(config.root, f);
              if (!existsSync(filename))
                filename = join(config.publicDir, f);
              if (!existsSync(filename))
                throw new Error(
                  `ENOENT: Could not load manifest asset "${f}".
Manifest assets must exist in one of these directories:
Project root: "${config.root}"
Public dir: "${config.publicDir}"`
                );
              this.emitFile({
                type: "asset",
                fileName: f,
                // TODO: cache source buffer
                source: await readFile(filename)
              });
            }
          })
        );
        if (config.command === "serve" && files.html.length) {
          const refId2 = this.emitFile({
            type: "asset",
            name: "precontroller.js",
            source: precontrollerJs
          });
          const precontrollerJsName = this.getFileName(refId2);
          files.html.map(
            (f) => this.emitFile({
              type: "asset",
              fileName: f,
              source: precontrollerHtml.replace(
                "%SCRIPT%",
                `/${precontrollerJsName}`
              )
            })
          );
        }
        const manifestJson = bundle["manifest.json"];
        if (typeof manifestJson === "undefined") {
          this.emitFile({
            type: "asset",
            fileName: "manifest.json",
            source: JSON.stringify(manifest2, null, 2) + "\n"
          });
        } else {
          manifestJson.source = JSON.stringify(manifest2, null, 2) + "\n";
        }
        delete bundle[manifestName];
      }
    }
  ];
};

function compileFileResources(fileName, {
  chunks,
  files,
  config
}, resources = {
  assets: /* @__PURE__ */ new Set(),
  css: /* @__PURE__ */ new Set(),
  imports: /* @__PURE__ */ new Set()
}, processedFiles = /* @__PURE__ */ new Set()) {
  if (processedFiles.has(fileName)) {
    return resources;
  }
  processedFiles.add(fileName);
  const chunk = chunks.get(fileName);
  if (chunk) {
    const { modules, facadeModuleId, imports, dynamicImports } = chunk;
    for (const x of imports)
      resources.imports.add(x);
    for (const x of dynamicImports)
      resources.imports.add(x);
    for (const x of [...imports, ...dynamicImports])
      compileFileResources(x, { chunks, files, config }, resources, processedFiles);
    for (const m of Object.keys(modules))
      if (m !== facadeModuleId) {
        const key = prefix$1("/", relative(config.root, m.split("?")[0]));
        const script = contentScripts.get(key);
        if (script)
          if (typeof script.fileName === "undefined") {
            throw new Error(`Content script fileName for ${m} is undefined`);
          } else {
            resources.imports.add(script.fileName);
            compileFileResources(
              script.fileName,
              { chunks, files, config },
              resources,
              processedFiles
            );
          }
      }
  }
  const file = files.get(fileName);
  if (file) {
    const { assets = [], css = [] } = file;
    for (const x of assets)
      resources.assets.add(x);
    for (const x of css)
      resources.css.add(x);
  }
  return resources;
}

const defineManifest = (manifest) => manifest;
const defineDynamicResource = ({
  matches = ["http://*/*", "https://*/*"],
  use_dynamic_url = true
}) => ({
  matches,
  resources: [DYNAMIC_RESOURCE],
  use_dynamic_url
});
const DYNAMIC_RESOURCE = "<dynamic_resource>";

_debug("web-acc-res");
const pluginWebAccessibleResources = () => {
  let config;
  let injectCss;
  return [
    {
      name: "crx:web-accessible-resources",
      apply: "serve",
      enforce: "post",
      renderCrxManifest(manifest) {
        manifest.web_accessible_resources = manifest.web_accessible_resources ?? [];
        manifest.web_accessible_resources = manifest.web_accessible_resources.map(({ resources, ...rest }) => ({
          resources: resources.filter((r) => r !== DYNAMIC_RESOURCE),
          ...rest
        })).filter(({ resources }) => resources.length);
        manifest.web_accessible_resources.push({
          // change the extension origin on every reload
          use_dynamic_url: true,
          // all web origins can access
          matches: ["<all_urls>"],
          // all resources are web accessible
          resources: ["**/*", "*"]
        });
        return manifest;
      }
    },
    {
      name: "crx:web-accessible-resources",
      apply: "build",
      enforce: "post",
      async config({ build, ...config2 }, { command }) {
        const { contentScripts: contentScripts2 = {} } = await getOptions(config2);
        injectCss = contentScripts2.injectCss ?? true;
        return { ...config2, build: { ...build, manifest: command === "build" } };
      },
      configResolved(_config) {
        config = _config;
      },
      async renderCrxManifest(manifest, bundle) {
        const { web_accessible_resources: _war = [] } = manifest;
        const dynamicScriptMatches = /* @__PURE__ */ new Set();
        let dynamicScriptDynamicUrl = false;
        const web_accessible_resources = [];
        for (const r of _war) {
          const i = r.resources.indexOf(DYNAMIC_RESOURCE);
          if (i > -1 && isResourceByMatch(r)) {
            r.resources = [...r.resources];
            r.resources.splice(i, 1);
            for (const p of r.matches)
              dynamicScriptMatches.add(p);
            dynamicScriptDynamicUrl = r.use_dynamic_url ?? false;
          }
          if (r.resources.length > 0)
            web_accessible_resources.push(r);
        }
        if (dynamicScriptMatches.size === 0) {
          dynamicScriptMatches.add("http://*/*");
          dynamicScriptMatches.add("https://*/*");
        }
        if (contentScripts.size > 0) {
          const viteManifest = parseJsonAsset(
            bundle,
            "manifest.json"
          );
          const viteFiles = /* @__PURE__ */ new Map();
          for (const [, file] of Object.entries(viteManifest))
            viteFiles.set(file.file, file);
          if (viteFiles.size === 0)
            return null;
          const bundleChunks = /* @__PURE__ */ new Map();
          for (const chunk of Object.values(bundle))
            if (chunk.type === "chunk")
              bundleChunks.set(chunk.fileName, chunk);
          const moduleScriptResources = /* @__PURE__ */ new Map();
          for (const [
            key,
            { id, fileName, matches, type, isDynamicScript = false }
          ] of contentScripts)
            if (key === id) {
              if (isDynamicScript || matches.length)
                if (typeof fileName === "undefined") {
                  throw new Error(
                    `Content script filename is undefined for "${id}"`
                  );
                } else {
                  const { assets, css, imports } = compileFileResources(
                    fileName,
                    { chunks: bundleChunks, files: viteFiles, config }
                  );
                  contentScripts.get(key).css = [...css];
                  if (type === "loader")
                    imports.add(fileName);
                  const resource = {
                    matches: isDynamicScript ? [...dynamicScriptMatches] : matches,
                    resources: [...assets, ...imports],
                    use_dynamic_url: isDynamicScript ? dynamicScriptDynamicUrl : true
                  };
                  if (isDynamicScript || !injectCss) {
                    resource.resources.push(...css);
                  }
                  if (resource.resources.length)
                    if (type === "module") {
                      moduleScriptResources.set(fileName, resource);
                    } else {
                      resource.matches = [
                        ...new Set(
                          resource.matches.map(getMatchPatternOrigin).filter((match) => match.endsWith("/*"))
                        )
                      ];
                      web_accessible_resources.push(resource);
                    }
                }
            }
          for (const r of web_accessible_resources)
            if (isResourceByMatch(r))
              for (const res of r.resources)
                moduleScriptResources.delete(res);
          web_accessible_resources.push(...moduleScriptResources.values());
        }
        const hashedResources = /* @__PURE__ */ new Map();
        const combinedResources = [];
        for (const r of web_accessible_resources)
          if (isResourceByMatch(r)) {
            const { matches, resources, use_dynamic_url = false } = r;
            const key = JSON.stringify([use_dynamic_url, matches.sort()]);
            const combined = hashedResources.get(key) ?? /* @__PURE__ */ new Set();
            for (const res of resources)
              combined.add(res);
            hashedResources.set(key, combined);
          } else {
            combinedResources.push(r);
          }
        for (const [key, resources] of hashedResources)
          if (resources.size > 0) {
            const [use_dynamic_url, matches] = JSON.parse(key);
            combinedResources.push({
              matches,
              resources: [...resources],
              use_dynamic_url
            });
          }
        if (combinedResources.length === 0)
          delete manifest.web_accessible_resources;
        else
          manifest.web_accessible_resources = combinedResources;
        return manifest;
      }
    }
  ];
};

const crx = (options) => {
  contentScripts.clear();
  return [
    pluginOptionsProvider(options),
    pluginBackground(),
    pluginContentScripts(),
    pluginDeclaredContentScripts(),
    pluginDynamicContentScripts(),
    pluginFileWriter(),
    pluginFileWriterPublic(),
    pluginFileWriterPolyfill(),
    pluginHtmlInlineScripts(),
    pluginWebAccessibleResources(),
    pluginContentScriptsCss(),
    pluginHMR(),
    pluginManifest()
  ].flat();
};
const chromeExtension = crx;

export { allFilesReady, chromeExtension, crx, defineDynamicResource, defineManifest, fileReady as filesReady };
