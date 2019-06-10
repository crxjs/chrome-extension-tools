'use strict';

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var path = _interopDefault(require('path'));
var fs = _interopDefault(require('fs-extra'));
var cheerio = _interopDefault(require('cheerio'));
var manifest = require('@bumble/manifest');
var isValidPath = _interopDefault(require('is-valid-path'));
var MagicString = _interopDefault(require('magic-string'));
var memoize = _interopDefault(require('mem'));
var pm = _interopDefault(require('picomatch'));
var rollupPluginutils = require('rollup-pluginutils');

const loadAssetData = assetPath =>
  fs.readFile(assetPath).then(src => [assetPath, src]);

const zipArrays = (a1, a2) => a1.map((x, i) => [x, a2[i]]);

async function getAssetPathMapFns(assets) {
  return (await assets).map(([assetPath, assetSrc]) => {
    const name = path.basename(assetPath);
    const id = this.emitAsset(name, assetSrc);
    const assetFileName = this.getAssetFileName(id);

    return x => {
      if (typeof x !== 'string') return x

      if (assetPath.endsWith(x)) {
        return assetFileName
      } else {
        return x
      }
    }
  })
}

const loadHtml = (filePath) => {
  const htmlCode = fs.readFileSync(filePath, 'utf8');
  const $ = cheerio.load(htmlCode);

  return $
};

const getRelativePath = (htmlPath) => (p) =>
  path.join(path.dirname(htmlPath), p);

const getEntries = ($) =>
  $('script')
    .not('[data-rollup-asset]')
    .not('[src^="http:"]')
    .not('[src^="https:"]')
    .not('[src^="data:"]')
    .not('[src^="/"]')
    .toArray();

const getJsEntries = ([htmlPath, $]) =>
  getEntries($)
    .map((elem) => $(elem).attr('src'))
    .map(getRelativePath(htmlPath));

const mutateJsEntries = ($) => {
  getEntries($)
    .map((elem) => $(elem))
    .forEach((e) => {
      e.attr('type', 'module');
    });

  return $
};

/* ----------------- js assets ---------------- */

const getAssets = ($) =>
  $('script')
    .filter('[data-rollup-asset="true"]')
    .not('[src^="http:"]')
    .not('[src^="https:"]')
    .not('[src^="data:"]')
    .not('[src^="/"]')
    .toArray();

const getJsAssets = ([htmlPath, $]) =>
  getAssets($)
    .map((elem) => $(elem).attr('src'))
    .map(getRelativePath(htmlPath));

const mutateJsAssets = ($, fn) => {
  getAssets($)
    .map((elem) => $(elem))
    .forEach((e) => {
      const value = fn(e.attr('src'));
      e.attr('src', value);
    });

  return $
};

/* -------------------- css ------------------- */

const getCss = ($) =>
  $('link')
    .filter('[rel="stylesheet"]')
    .not('[href^="http:"]')
    .not('[href^="https:"]')
    .not('[href^="data:"]')
    .not('[href^="/"]')
    .toArray();

const getCssHrefs = ([htmlPath, $]) =>
  getCss($)
    .map((elem) => $(elem).attr('href'))
    .map(getRelativePath(htmlPath));

const mutateCssHrefs = ($, fn) => {
  getCss($)
    .map((elem) => $(elem))
    .forEach((e) => {
      const value = fn(e.attr('href'));
      e.attr('href', value);
    });

  return $
};

/* -------------------- img ------------------- */
const getImgs = ($) =>
  $('img')
    .not('[src^="http://"]')
    .not('[src^="https://"]')
    .not('[src^="data:"]')
    .not('[src^="/"]')
    .toArray();

const getFavicons = ($) =>
  $('link[rel="icon"]')
    .not('[href^="http:"]')
    .not('[href^="https:"]')
    .not('[href^="data:"]')
    .not('[href^="/"]')
    .toArray();

const getImgSrcs = ([htmlPath, $]) => {
  return [
    ...getImgs($).map((elem) => $(elem).attr('src')),
    // get favicons
    ...getFavicons($).map((elem) => $(elem).attr('href')),
  ].map(getRelativePath(htmlPath))
};

const mutateImgSrcs = ($, fn) => {
  getImgs($)
    .map((elem) => $(elem))
    .forEach((e) => {
      const value = fn(e.attr('src'));
      e.attr('src', value);
    });

  getFavicons($)
    .map((elem) => $(elem))
    .forEach((e) => {
      const value = fn(e.attr('href'));
      e.attr('href', value);
    });

  return $
};

/* ------------- helper functions ------------- */

const not = fn => x => !fn(x);

const isHtml = path => /\.html?$/.test(path);

const loadHtmlAssets = htmlData =>
  Promise.all(
    htmlData.map(async data =>
      data.concat({
        js: await Promise.all(
          getJsAssets(data).map(loadAssetData),
        ),
        img: await Promise.all(
          getImgSrcs(data).map(loadAssetData),
        ),
        css: await Promise.all(
          getCssHrefs(data).map(loadAssetData),
        ),
      }),
    ),
  );

const name = 'html-inputs';

/* ============================================ */
/*                  HTML-INPUTS                 */
/* ============================================ */

function htmlInputs() {
  /* -------------- hooks closures -------------- */

  const cache = {};

  // Assets will be a Promise
  let htmlAssets;
  let jsEntries;

  /* --------------- plugin object -------------- */
  return {
    name,

    /* ============================================ */
    /*                 OPTIONS HOOK                 */
    /* ============================================ */

    options(options) {
      // Skip if cache.input exists
      if (cache.input) {
        return {
          ...options,
          input: cache.input,
        }
      }

      // Cast options.input to array
      if (typeof options.input === 'string') {
        options.input = [options.input];
      }

      // Filter htm and html files
      cache.htmlPaths = options.input.filter(isHtml);

      // Skip if no html files
      if (!cache.htmlPaths.length) {
        htmlAssets = Promise.resolve([]);
        return options
      }

      /* -------------- Load html files ------------- */

      const html$ = cache.htmlPaths.map(loadHtml);

      const htmlData = zipArrays(cache.htmlPaths, html$);

      // Start async load for html assets
      // NEXT: reload html assets on change
      htmlAssets = loadHtmlAssets(htmlData);

      // Get JS entry file names
      jsEntries = htmlData.flatMap(getJsEntries);

      // Cache jsEntries with existing options.input
      cache.input = options.input
        .filter(not(isHtml))
        .concat(jsEntries);

      return {
        ...options,
        input: cache.input,
      }
    },

    /* ============================================ */
    /*              HANDLE FILE CHANGES             */
    /* ============================================ */

    buildStart() {
      cache.htmlPaths.forEach((htmlPath) => {
        this.addWatchFile(htmlPath);
      });
    },

    watchChange(id) {
      if (id.endsWith('.html')) {
        cache.input = null;
      }
    },

    /* ============================================ */
    /*                GENERATEBUNDLE                */
    /* ============================================ */

    async generateBundle(options, bundle) {
      // CONCERN: relative paths within CSS files will fail
      // SOLUTION: use postcss to process CSS asset src
      await Promise.all(
        (await htmlAssets).map(
          async ([htmlPath, $, { js, img, css }]) => {
            const htmlName = path.basename(htmlPath);

            // Setup file path mapping fns
            const jsFns = await getAssetPathMapFns.call(this, js);
            const imgFns = await getAssetPathMapFns.call(
              this,
              img,
            );
            const cssFns = await getAssetPathMapFns.call(
              this,
              css,
            );

            // Update html file with new
            // script and asset file paths
            mutateJsEntries($);
            jsFns.reduce(mutateJsAssets, $);
            cssFns.reduce(mutateCssHrefs, $);
            imgFns.reduce(mutateImgSrcs, $);

            // Add custom asset to bundle
            bundle[htmlName] = {
              fileName: htmlName,
              isAsset: true,
              source: $.html(),
            };
          },
        ),
      );
    },
  }
}

const mapObjectValues = (obj, fn) =>
  Object.entries(obj).reduce((r, [key, value]) => {
    if (typeof value !== 'object') {
      // is primitive
      return { ...r, [key]: fn(value) }
    } else if (Array.isArray(value)) {
      // is array
      return { ...r, [key]: value.map(fn) }
    } else {
      // is plain object
      return { ...r, [key]: mapObjectValues(value, fn) }
    }
  }, {});

const name$1 = 'manifest-input';

/* ---- predicate object for deriveEntries ---- */
// const predObj = {
//   js: s => /\.js$/.test(s),
//   css: s => /\.css$/.test(s),
//   html: s => /\.html$/.test(s),
//   img: s => /\.png$/.test(s),
//   filter: v =>
//     typeof v === 'string' &&
//     v.includes('.') &&
//     !v.includes('*') &&
//     !/^https?:/.test(v),
// }

const npmPkgDetails = {
  name: process.env.npm_package_name,
  version: process.env.npm_package_version,
  description: process.env.npm_package_description,
};

/* ============================================ */
/*                MANIFEST-INPUT                */
/* ============================================ */

function manifestInput({
  pkg,
  verbose,
  permissions = {},
  assets = {
    include: ['**/*.png', '**/*.css'],
  },
  entries = {
    include: ['**/*'],
  },
  iiafe = {
    // include is defaulted to [], so exclude can be used by itself
  },
  publicKey,
  useReloader = process.env.ROLLUP_WATCH,
  reloader,
} = {}) {
  if (!pkg) {
    pkg = npmPkgDetails;
  }

  let _useReloader = useReloader && reloader;
  let startReloader = true;

  /* -------------- hooks closures -------------- */
  iiafe.include = iiafe.include || [];
  let iiafeFilter;

  let loadedAssets;
  let srcDir;

  let manifestPath;

  const cache = {};

  const manifestName = 'manifest.json';

  const permissionsFilter = pm(
    permissions.include || '**/*',
    permissions.exclude,
  );

  const assetFilter = pm(assets.include, {
    ignore: assets.exclude,
  });

  const entryFilter = pm(entries.include, {
    ignore: entries.exclude,
  });

  const derivePermissions = memoize(manifest.derivePermissions);

  /* --------------- plugin object -------------- */
  return {
    name: name$1,

    /* ============================================ */
    /*                 OPTIONS HOOK                 */
    /* ============================================ */

    options(options) {
      // Do not reload manifest without changes
      if (cache.manifest) {
        return { ...options, input: cache.input }
      }

      manifestPath = options.input;
      srcDir = path.dirname(manifestPath);

      // Check that input is manifest.json
      if (!manifestPath.endsWith(manifestName)) {
        throw new TypeError(
          `${name$1}: input is not manifest.json`,
        )
      }

      // Load manifest.json
      cache.manifest = fs.readJSONSync(manifestPath);

      // Derive entry paths from manifest
      const { assetPaths, entryPaths } = manifest.deriveEntries(
        cache.manifest,
        {
          assetPaths: assetFilter,
          entryPaths: entryFilter,
          transform: (name) => path.join(srcDir, name),
          filter: (v) =>
            typeof v === 'string' &&
            isValidPath(v) &&
            !/^https?:/.test(v),
        },
      );

      // Start async asset loading
      // CONCERN: relative paths within CSS files will fail
      // SOLUTION: use postcss to process CSS asset src
      loadedAssets = Promise.all(assetPaths.map(loadAssetData));

      // Render only manifest entry js files
      // as async iife
      const js = entryPaths.filter((p) => /\.js$/.test(p));
      iiafeFilter = rollupPluginutils.createFilter(
        iiafe.include.concat(js),
        iiafe.exclude,
      );

      // Cache derived inputs
      cache.input = entryPaths;

      return { ...options, input: cache.input }
    },

    /* ============================================ */
    /*              HANDLE WATCH FILES              */
    /* ============================================ */

    async buildStart() {
      this.addWatchFile(manifestPath);
    },

    watchChange(id) {
      if (id.endsWith(manifestName)) {
        // Dump cache.manifest if manifest.json changes
        cache.manifest = null;
      }
    },

    /* ============================================ */
    /*                   TRANSFORM                  */
    /* ============================================ */

    // transform(code, id) {},

    /* ============================================ */
    /*       MAKE MANIFEST ENTRIES ASYNC IIFE       */
    /* ============================================ */

    renderChunk(
      source,
      { isEntry, facadeModuleId: id, fileName },
      { sourcemap },
    ) {
      if (!isEntry || !iiafeFilter(id)) return null

      // turn es imports to dynamic imports
      const code = source.replace(
        /^import (.+) from ('.+?');$/gm,
        (line, $1, $2) => {
          const asg = $1.replace(
            /(?<=\{.+)( as )(?=.+?\})/g,
            ': ',
          );
          return `const ${asg} = await import(${$2});`
        },
      );

      const magic = new MagicString(code);

      // Async IIFE-fy
      magic
        .indent('  ')
        .prepend('(async () => {\n')
        .append('\n})();\n');

      // Generate sourcemaps
      return sourcemap
        ? {
            code: magic.toString(),
            map: magic.generateMap({
              source: fileName,
              hires: true,
            }),
          }
        : { code: magic.toString() }
    },

    /* ============================================ */
    /*                GENERATEBUNDLE                */
    /* ============================================ */

    async generateBundle(options, bundle) {
      // Get module ids for all chunks
      const permissions = Array.from(
        Object.values(bundle).reduce(
          (set, { code, facadeModuleId: id }) => {
            // The only use for this is to exclude a chunk
            if (id && permissionsFilter(id)) {
              return new Set([
                ...derivePermissions(code),
                ...set,
              ])
            } else {
              return set
            }
          },
          new Set(),
        ),
      );

      if (verbose) {
        // Compare to last permissions
        const permsHash = JSON.stringify(permissions);

        if (!cache.permsHash) {
          console.log('Derived permissions:', permissions);
        } else if (permsHash !== cache.permsHash) {
          console.log('Derived new permissions:', permissions);
        }

        cache.permsHash = permsHash;
      }

      // Emit loaded assets and
      // Create asset path updaters
      const assetPathMapFns = await getAssetPathMapFns.call(
        this,
        loadedAssets,
      );

      try {
        const manifestBody = manifest.deriveManifest(
          pkg,
          // Update asset paths and return manifest
          assetPathMapFns.reduce(
            mapObjectValues,
            cache.manifest,
          ),
          permissions,
        );

        // Add reloader script
        if (_useReloader) {
          console.log('_useReloader', _useReloader);

          if (startReloader) {
            await reloader.start((shouldStart) => {
              startReloader = shouldStart;
            });

            console.log('reloader is running...');
          }

          // TODO: reloader should be wrapped
          //       in a dynamic import
          //       to support module features.
          const clientId = this.emitAsset(
            'reloader-client.js',
            reloader.getClientCode(),
          );

          const clientPath = this.getAssetFileName(clientId);

          // TODO: here, client path should be the wrapper file.
          reloader.updateManifest(manifestBody, clientPath);
        }

        if (publicKey) {
          manifestBody.key = publicKey;
        } else {
          delete manifestBody.key;
        }

        // Mutate bundle to emit custom asset
        bundle[manifestName] = {
          fileName: manifestName,
          isAsset: true,
          source: JSON.stringify(manifestBody, null, 2),
        };
      } catch (error) {
        if (error.name !== 'ValidationError') throw error

        error.errors.forEach((err) => {
          console.log(err);
        });

        this.error(error.message);
      }
    },

    writeBundle() {
      if (_useReloader) {
        return reloader.reload().catch((error) => {
          const message = `${error.message} (${error.code})`;
          this.warn(message);
        })
      }
    },
  }
}

var index = opts => {
  const manifest = manifestInput(opts);
  const html = htmlInputs();
  const plugins = [manifest, html];

  return {
    name: 'chrome-extension',

    options(options) {
      return plugins.reduce(
        (o, p) => (p.options ? p.options.call(this, o) : o),
        options,
      )
    },

    buildStart(options) {
      manifest.buildStart.call(this, options);
      html.buildStart.call(this, options);
    },

    watchChange(id) {
      manifest.watchChange.call(this, id);
      html.watchChange.call(this, id);
    },

    renderChunk(...args) {
      return manifest.renderChunk.call(this, ...args)
    },

    async generateBundle(...args) {
      const hook = 'generateBundle';

      await Promise.all([
        manifest[hook].call(this, ...args),
        html[hook].call(this, ...args),
      ]);
    },

    writeBundle() {
      manifest.writeBundle.call(this);
    },
  }
};

module.exports = index;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hyb21lLWV4dGVuc2lvbi1janMuanMiLCJzb3VyY2VzIjpbIi4uL3NyYy9oZWxwZXJzLmpzIiwiLi4vc3JjL2h0bWwtaW5wdXRzL2NoZWVyaW8uanMiLCIuLi9zcmMvaHRtbC1pbnB1dHMvaGVscGVycy5qcyIsIi4uL3NyYy9odG1sLWlucHV0cy9pbmRleC5qcyIsIi4uL3NyYy9tYW5pZmVzdC1pbnB1dC9tYXBPYmplY3RWYWx1ZXMuanMiLCIuLi9zcmMvbWFuaWZlc3QtaW5wdXQvaW5kZXguanMiLCIuLi9zcmMvaW5kZXguanMiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IGZzIGZyb20gJ2ZzLWV4dHJhJ1xuaW1wb3J0IHBhdGggZnJvbSAncGF0aCdcblxuZXhwb3J0IGNvbnN0IG5vdCA9IGZuID0+IHggPT4gIWZuKHgpXG5cbmV4cG9ydCBjb25zdCBsb2FkQXNzZXREYXRhID0gYXNzZXRQYXRoID0+XG4gIGZzLnJlYWRGaWxlKGFzc2V0UGF0aCkudGhlbihzcmMgPT4gW2Fzc2V0UGF0aCwgc3JjXSlcblxuZXhwb3J0IGNvbnN0IHppcEFycmF5cyA9IChhMSwgYTIpID0+IGExLm1hcCgoeCwgaSkgPT4gW3gsIGEyW2ldXSlcblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGdldEFzc2V0UGF0aE1hcEZucyhhc3NldHMpIHtcbiAgcmV0dXJuIChhd2FpdCBhc3NldHMpLm1hcCgoW2Fzc2V0UGF0aCwgYXNzZXRTcmNdKSA9PiB7XG4gICAgY29uc3QgbmFtZSA9IHBhdGguYmFzZW5hbWUoYXNzZXRQYXRoKVxuICAgIGNvbnN0IGlkID0gdGhpcy5lbWl0QXNzZXQobmFtZSwgYXNzZXRTcmMpXG4gICAgY29uc3QgYXNzZXRGaWxlTmFtZSA9IHRoaXMuZ2V0QXNzZXRGaWxlTmFtZShpZClcblxuICAgIHJldHVybiB4ID0+IHtcbiAgICAgIGlmICh0eXBlb2YgeCAhPT0gJ3N0cmluZycpIHJldHVybiB4XG5cbiAgICAgIGlmIChhc3NldFBhdGguZW5kc1dpdGgoeCkpIHtcbiAgICAgICAgcmV0dXJuIGFzc2V0RmlsZU5hbWVcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiB4XG4gICAgICB9XG4gICAgfVxuICB9KVxufVxuXG5leHBvcnQgY29uc3Qgd3JpdGVGaWxlID0gZGVzdCA9PiAoW2h0bWxQYXRoLCBodG1sU3JjXSkgPT4ge1xuICBjb25zdCBiYXNlTmFtZSA9IHBhdGguYmFzZW5hbWUoaHRtbFBhdGgpXG4gIGNvbnN0IGRlc3RQYXRoID0gcGF0aC5qb2luKGRlc3QsIGJhc2VOYW1lKVxuICByZXR1cm4gZnMud3JpdGVGaWxlKGRlc3RQYXRoLCBodG1sU3JjKVxufVxuIiwiaW1wb3J0IHBhdGggZnJvbSAncGF0aCdcbmltcG9ydCBmcyBmcm9tICdmcy1leHRyYSdcbmltcG9ydCBjaGVlcmlvIGZyb20gJ2NoZWVyaW8nXG5cbmV4cG9ydCBjb25zdCBsb2FkSHRtbCA9IChmaWxlUGF0aCkgPT4ge1xuICBjb25zdCBodG1sQ29kZSA9IGZzLnJlYWRGaWxlU3luYyhmaWxlUGF0aCwgJ3V0ZjgnKVxuICBjb25zdCAkID0gY2hlZXJpby5sb2FkKGh0bWxDb2RlKVxuXG4gIHJldHVybiAkXG59XG5cbmNvbnN0IGdldFJlbGF0aXZlUGF0aCA9IChodG1sUGF0aCkgPT4gKHApID0+XG4gIHBhdGguam9pbihwYXRoLmRpcm5hbWUoaHRtbFBhdGgpLCBwKVxuXG5jb25zdCBnZXRFbnRyaWVzID0gKCQpID0+XG4gICQoJ3NjcmlwdCcpXG4gICAgLm5vdCgnW2RhdGEtcm9sbHVwLWFzc2V0XScpXG4gICAgLm5vdCgnW3NyY149XCJodHRwOlwiXScpXG4gICAgLm5vdCgnW3NyY149XCJodHRwczpcIl0nKVxuICAgIC5ub3QoJ1tzcmNePVwiZGF0YTpcIl0nKVxuICAgIC5ub3QoJ1tzcmNePVwiL1wiXScpXG4gICAgLnRvQXJyYXkoKVxuXG5leHBvcnQgY29uc3QgZ2V0SnNFbnRyaWVzID0gKFtodG1sUGF0aCwgJF0pID0+XG4gIGdldEVudHJpZXMoJClcbiAgICAubWFwKChlbGVtKSA9PiAkKGVsZW0pLmF0dHIoJ3NyYycpKVxuICAgIC5tYXAoZ2V0UmVsYXRpdmVQYXRoKGh0bWxQYXRoKSlcblxuZXhwb3J0IGNvbnN0IG11dGF0ZUpzRW50cmllcyA9ICgkKSA9PiB7XG4gIGdldEVudHJpZXMoJClcbiAgICAubWFwKChlbGVtKSA9PiAkKGVsZW0pKVxuICAgIC5mb3JFYWNoKChlKSA9PiB7XG4gICAgICBlLmF0dHIoJ3R5cGUnLCAnbW9kdWxlJylcbiAgICB9KVxuXG4gIHJldHVybiAkXG59XG5cbi8qIC0tLS0tLS0tLS0tLS0tLS0tIGpzIGFzc2V0cyAtLS0tLS0tLS0tLS0tLS0tICovXG5cbmNvbnN0IGdldEFzc2V0cyA9ICgkKSA9PlxuICAkKCdzY3JpcHQnKVxuICAgIC5maWx0ZXIoJ1tkYXRhLXJvbGx1cC1hc3NldD1cInRydWVcIl0nKVxuICAgIC5ub3QoJ1tzcmNePVwiaHR0cDpcIl0nKVxuICAgIC5ub3QoJ1tzcmNePVwiaHR0cHM6XCJdJylcbiAgICAubm90KCdbc3JjXj1cImRhdGE6XCJdJylcbiAgICAubm90KCdbc3JjXj1cIi9cIl0nKVxuICAgIC50b0FycmF5KClcblxuZXhwb3J0IGNvbnN0IGdldEpzQXNzZXRzID0gKFtodG1sUGF0aCwgJF0pID0+XG4gIGdldEFzc2V0cygkKVxuICAgIC5tYXAoKGVsZW0pID0+ICQoZWxlbSkuYXR0cignc3JjJykpXG4gICAgLm1hcChnZXRSZWxhdGl2ZVBhdGgoaHRtbFBhdGgpKVxuXG5leHBvcnQgY29uc3QgbXV0YXRlSnNBc3NldHMgPSAoJCwgZm4pID0+IHtcbiAgZ2V0QXNzZXRzKCQpXG4gICAgLm1hcCgoZWxlbSkgPT4gJChlbGVtKSlcbiAgICAuZm9yRWFjaCgoZSkgPT4ge1xuICAgICAgY29uc3QgdmFsdWUgPSBmbihlLmF0dHIoJ3NyYycpKVxuICAgICAgZS5hdHRyKCdzcmMnLCB2YWx1ZSlcbiAgICB9KVxuXG4gIHJldHVybiAkXG59XG5cbi8qIC0tLS0tLS0tLS0tLS0tLS0tLS0tIGNzcyAtLS0tLS0tLS0tLS0tLS0tLS0tICovXG5cbmNvbnN0IGdldENzcyA9ICgkKSA9PlxuICAkKCdsaW5rJylcbiAgICAuZmlsdGVyKCdbcmVsPVwic3R5bGVzaGVldFwiXScpXG4gICAgLm5vdCgnW2hyZWZePVwiaHR0cDpcIl0nKVxuICAgIC5ub3QoJ1tocmVmXj1cImh0dHBzOlwiXScpXG4gICAgLm5vdCgnW2hyZWZePVwiZGF0YTpcIl0nKVxuICAgIC5ub3QoJ1tocmVmXj1cIi9cIl0nKVxuICAgIC50b0FycmF5KClcblxuZXhwb3J0IGNvbnN0IGdldENzc0hyZWZzID0gKFtodG1sUGF0aCwgJF0pID0+XG4gIGdldENzcygkKVxuICAgIC5tYXAoKGVsZW0pID0+ICQoZWxlbSkuYXR0cignaHJlZicpKVxuICAgIC5tYXAoZ2V0UmVsYXRpdmVQYXRoKGh0bWxQYXRoKSlcblxuZXhwb3J0IGNvbnN0IG11dGF0ZUNzc0hyZWZzID0gKCQsIGZuKSA9PiB7XG4gIGdldENzcygkKVxuICAgIC5tYXAoKGVsZW0pID0+ICQoZWxlbSkpXG4gICAgLmZvckVhY2goKGUpID0+IHtcbiAgICAgIGNvbnN0IHZhbHVlID0gZm4oZS5hdHRyKCdocmVmJykpXG4gICAgICBlLmF0dHIoJ2hyZWYnLCB2YWx1ZSlcbiAgICB9KVxuXG4gIHJldHVybiAkXG59XG5cbi8qIC0tLS0tLS0tLS0tLS0tLS0tLS0tIGltZyAtLS0tLS0tLS0tLS0tLS0tLS0tICovXG5jb25zdCBnZXRJbWdzID0gKCQpID0+XG4gICQoJ2ltZycpXG4gICAgLm5vdCgnW3NyY149XCJodHRwOi8vXCJdJylcbiAgICAubm90KCdbc3JjXj1cImh0dHBzOi8vXCJdJylcbiAgICAubm90KCdbc3JjXj1cImRhdGE6XCJdJylcbiAgICAubm90KCdbc3JjXj1cIi9cIl0nKVxuICAgIC50b0FycmF5KClcblxuY29uc3QgZ2V0RmF2aWNvbnMgPSAoJCkgPT5cbiAgJCgnbGlua1tyZWw9XCJpY29uXCJdJylcbiAgICAubm90KCdbaHJlZl49XCJodHRwOlwiXScpXG4gICAgLm5vdCgnW2hyZWZePVwiaHR0cHM6XCJdJylcbiAgICAubm90KCdbaHJlZl49XCJkYXRhOlwiXScpXG4gICAgLm5vdCgnW2hyZWZePVwiL1wiXScpXG4gICAgLnRvQXJyYXkoKVxuXG5leHBvcnQgY29uc3QgZ2V0SW1nU3JjcyA9IChbaHRtbFBhdGgsICRdKSA9PiB7XG4gIHJldHVybiBbXG4gICAgLi4uZ2V0SW1ncygkKS5tYXAoKGVsZW0pID0+ICQoZWxlbSkuYXR0cignc3JjJykpLFxuICAgIC8vIGdldCBmYXZpY29uc1xuICAgIC4uLmdldEZhdmljb25zKCQpLm1hcCgoZWxlbSkgPT4gJChlbGVtKS5hdHRyKCdocmVmJykpLFxuICBdLm1hcChnZXRSZWxhdGl2ZVBhdGgoaHRtbFBhdGgpKVxufVxuXG5leHBvcnQgY29uc3QgbXV0YXRlSW1nU3JjcyA9ICgkLCBmbikgPT4ge1xuICBnZXRJbWdzKCQpXG4gICAgLm1hcCgoZWxlbSkgPT4gJChlbGVtKSlcbiAgICAuZm9yRWFjaCgoZSkgPT4ge1xuICAgICAgY29uc3QgdmFsdWUgPSBmbihlLmF0dHIoJ3NyYycpKVxuICAgICAgZS5hdHRyKCdzcmMnLCB2YWx1ZSlcbiAgICB9KVxuXG4gIGdldEZhdmljb25zKCQpXG4gICAgLm1hcCgoZWxlbSkgPT4gJChlbGVtKSlcbiAgICAuZm9yRWFjaCgoZSkgPT4ge1xuICAgICAgY29uc3QgdmFsdWUgPSBmbihlLmF0dHIoJ2hyZWYnKSlcbiAgICAgIGUuYXR0cignaHJlZicsIHZhbHVlKVxuICAgIH0pXG5cbiAgcmV0dXJuICRcbn1cbiIsImltcG9ydCB7IGxvYWRBc3NldERhdGEgfSBmcm9tICcuLi9oZWxwZXJzJ1xuaW1wb3J0IHsgZ2V0Q3NzSHJlZnMsIGdldEltZ1NyY3MsIGdldEpzQXNzZXRzIH0gZnJvbSAnLi9jaGVlcmlvJ1xuXG4vKiAtLS0tLS0tLS0tLS0tIGhlbHBlciBmdW5jdGlvbnMgLS0tLS0tLS0tLS0tLSAqL1xuXG5leHBvcnQgY29uc3Qgbm90ID0gZm4gPT4geCA9PiAhZm4oeClcblxuZXhwb3J0IGNvbnN0IGlzSHRtbCA9IHBhdGggPT4gL1xcLmh0bWw/JC8udGVzdChwYXRoKVxuXG5leHBvcnQgY29uc3QgbG9hZEh0bWxBc3NldHMgPSBodG1sRGF0YSA9PlxuICBQcm9taXNlLmFsbChcbiAgICBodG1sRGF0YS5tYXAoYXN5bmMgZGF0YSA9PlxuICAgICAgZGF0YS5jb25jYXQoe1xuICAgICAgICBqczogYXdhaXQgUHJvbWlzZS5hbGwoXG4gICAgICAgICAgZ2V0SnNBc3NldHMoZGF0YSkubWFwKGxvYWRBc3NldERhdGEpLFxuICAgICAgICApLFxuICAgICAgICBpbWc6IGF3YWl0IFByb21pc2UuYWxsKFxuICAgICAgICAgIGdldEltZ1NyY3MoZGF0YSkubWFwKGxvYWRBc3NldERhdGEpLFxuICAgICAgICApLFxuICAgICAgICBjc3M6IGF3YWl0IFByb21pc2UuYWxsKFxuICAgICAgICAgIGdldENzc0hyZWZzKGRhdGEpLm1hcChsb2FkQXNzZXREYXRhKSxcbiAgICAgICAgKSxcbiAgICAgIH0pLFxuICAgICksXG4gIClcbiIsImltcG9ydCBwYXRoIGZyb20gJ3BhdGgnXG5pbXBvcnQgeyBnZXRBc3NldFBhdGhNYXBGbnMsIHppcEFycmF5cyB9IGZyb20gJy4uL2hlbHBlcnMnXG5pbXBvcnQge1xuICBnZXRKc0VudHJpZXMsXG4gIGxvYWRIdG1sLFxuICBtdXRhdGVDc3NIcmVmcyxcbiAgbXV0YXRlSW1nU3JjcyxcbiAgbXV0YXRlSnNBc3NldHMsXG4gIG11dGF0ZUpzRW50cmllcyxcbn0gZnJvbSAnLi9jaGVlcmlvJ1xuaW1wb3J0IHsgaXNIdG1sLCBsb2FkSHRtbEFzc2V0cywgbm90IH0gZnJvbSAnLi9oZWxwZXJzJ1xuXG5jb25zdCBuYW1lID0gJ2h0bWwtaW5wdXRzJ1xuXG4vKiA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PSAqL1xuLyogICAgICAgICAgICAgICAgICBIVE1MLUlOUFVUUyAgICAgICAgICAgICAgICAgKi9cbi8qID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09ICovXG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIGh0bWxJbnB1dHMoKSB7XG4gIC8qIC0tLS0tLS0tLS0tLS0tIGhvb2tzIGNsb3N1cmVzIC0tLS0tLS0tLS0tLS0tICovXG5cbiAgY29uc3QgY2FjaGUgPSB7fVxuXG4gIC8vIEFzc2V0cyB3aWxsIGJlIGEgUHJvbWlzZVxuICBsZXQgaHRtbEFzc2V0c1xuICBsZXQganNFbnRyaWVzXG5cbiAgLyogLS0tLS0tLS0tLS0tLS0tIHBsdWdpbiBvYmplY3QgLS0tLS0tLS0tLS0tLS0gKi9cbiAgcmV0dXJuIHtcbiAgICBuYW1lLFxuXG4gICAgLyogPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0gKi9cbiAgICAvKiAgICAgICAgICAgICAgICAgT1BUSU9OUyBIT09LICAgICAgICAgICAgICAgICAqL1xuICAgIC8qID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09ICovXG5cbiAgICBvcHRpb25zKG9wdGlvbnMpIHtcbiAgICAgIC8vIFNraXAgaWYgY2FjaGUuaW5wdXQgZXhpc3RzXG4gICAgICBpZiAoY2FjaGUuaW5wdXQpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAuLi5vcHRpb25zLFxuICAgICAgICAgIGlucHV0OiBjYWNoZS5pbnB1dCxcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICAvLyBDYXN0IG9wdGlvbnMuaW5wdXQgdG8gYXJyYXlcbiAgICAgIGlmICh0eXBlb2Ygb3B0aW9ucy5pbnB1dCA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgb3B0aW9ucy5pbnB1dCA9IFtvcHRpb25zLmlucHV0XVxuICAgICAgfVxuXG4gICAgICAvLyBGaWx0ZXIgaHRtIGFuZCBodG1sIGZpbGVzXG4gICAgICBjYWNoZS5odG1sUGF0aHMgPSBvcHRpb25zLmlucHV0LmZpbHRlcihpc0h0bWwpXG5cbiAgICAgIC8vIFNraXAgaWYgbm8gaHRtbCBmaWxlc1xuICAgICAgaWYgKCFjYWNoZS5odG1sUGF0aHMubGVuZ3RoKSB7XG4gICAgICAgIGh0bWxBc3NldHMgPSBQcm9taXNlLnJlc29sdmUoW10pXG4gICAgICAgIHJldHVybiBvcHRpb25zXG4gICAgICB9XG5cbiAgICAgIC8qIC0tLS0tLS0tLS0tLS0tIExvYWQgaHRtbCBmaWxlcyAtLS0tLS0tLS0tLS0tICovXG5cbiAgICAgIGNvbnN0IGh0bWwkID0gY2FjaGUuaHRtbFBhdGhzLm1hcChsb2FkSHRtbClcblxuICAgICAgY29uc3QgaHRtbERhdGEgPSB6aXBBcnJheXMoY2FjaGUuaHRtbFBhdGhzLCBodG1sJClcblxuICAgICAgLy8gU3RhcnQgYXN5bmMgbG9hZCBmb3IgaHRtbCBhc3NldHNcbiAgICAgIC8vIE5FWFQ6IHJlbG9hZCBodG1sIGFzc2V0cyBvbiBjaGFuZ2VcbiAgICAgIGh0bWxBc3NldHMgPSBsb2FkSHRtbEFzc2V0cyhodG1sRGF0YSlcblxuICAgICAgLy8gR2V0IEpTIGVudHJ5IGZpbGUgbmFtZXNcbiAgICAgIGpzRW50cmllcyA9IGh0bWxEYXRhLmZsYXRNYXAoZ2V0SnNFbnRyaWVzKVxuXG4gICAgICAvLyBDYWNoZSBqc0VudHJpZXMgd2l0aCBleGlzdGluZyBvcHRpb25zLmlucHV0XG4gICAgICBjYWNoZS5pbnB1dCA9IG9wdGlvbnMuaW5wdXRcbiAgICAgICAgLmZpbHRlcihub3QoaXNIdG1sKSlcbiAgICAgICAgLmNvbmNhdChqc0VudHJpZXMpXG5cbiAgICAgIHJldHVybiB7XG4gICAgICAgIC4uLm9wdGlvbnMsXG4gICAgICAgIGlucHV0OiBjYWNoZS5pbnB1dCxcbiAgICAgIH1cbiAgICB9LFxuXG4gICAgLyogPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0gKi9cbiAgICAvKiAgICAgICAgICAgICAgSEFORExFIEZJTEUgQ0hBTkdFUyAgICAgICAgICAgICAqL1xuICAgIC8qID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09ICovXG5cbiAgICBidWlsZFN0YXJ0KCkge1xuICAgICAgY2FjaGUuaHRtbFBhdGhzLmZvckVhY2goKGh0bWxQYXRoKSA9PiB7XG4gICAgICAgIHRoaXMuYWRkV2F0Y2hGaWxlKGh0bWxQYXRoKVxuICAgICAgfSlcbiAgICB9LFxuXG4gICAgd2F0Y2hDaGFuZ2UoaWQpIHtcbiAgICAgIGlmIChpZC5lbmRzV2l0aCgnLmh0bWwnKSkge1xuICAgICAgICBjYWNoZS5pbnB1dCA9IG51bGxcbiAgICAgIH1cbiAgICB9LFxuXG4gICAgLyogPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0gKi9cbiAgICAvKiAgICAgICAgICAgICAgICBHRU5FUkFURUJVTkRMRSAgICAgICAgICAgICAgICAqL1xuICAgIC8qID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09ICovXG5cbiAgICBhc3luYyBnZW5lcmF0ZUJ1bmRsZShvcHRpb25zLCBidW5kbGUpIHtcbiAgICAgIC8vIENPTkNFUk46IHJlbGF0aXZlIHBhdGhzIHdpdGhpbiBDU1MgZmlsZXMgd2lsbCBmYWlsXG4gICAgICAvLyBTT0xVVElPTjogdXNlIHBvc3Rjc3MgdG8gcHJvY2VzcyBDU1MgYXNzZXQgc3JjXG4gICAgICBhd2FpdCBQcm9taXNlLmFsbChcbiAgICAgICAgKGF3YWl0IGh0bWxBc3NldHMpLm1hcChcbiAgICAgICAgICBhc3luYyAoW2h0bWxQYXRoLCAkLCB7IGpzLCBpbWcsIGNzcyB9XSkgPT4ge1xuICAgICAgICAgICAgY29uc3QgaHRtbE5hbWUgPSBwYXRoLmJhc2VuYW1lKGh0bWxQYXRoKVxuXG4gICAgICAgICAgICAvLyBTZXR1cCBmaWxlIHBhdGggbWFwcGluZyBmbnNcbiAgICAgICAgICAgIGNvbnN0IGpzRm5zID0gYXdhaXQgZ2V0QXNzZXRQYXRoTWFwRm5zLmNhbGwodGhpcywganMpXG4gICAgICAgICAgICBjb25zdCBpbWdGbnMgPSBhd2FpdCBnZXRBc3NldFBhdGhNYXBGbnMuY2FsbChcbiAgICAgICAgICAgICAgdGhpcyxcbiAgICAgICAgICAgICAgaW1nLFxuICAgICAgICAgICAgKVxuICAgICAgICAgICAgY29uc3QgY3NzRm5zID0gYXdhaXQgZ2V0QXNzZXRQYXRoTWFwRm5zLmNhbGwoXG4gICAgICAgICAgICAgIHRoaXMsXG4gICAgICAgICAgICAgIGNzcyxcbiAgICAgICAgICAgIClcblxuICAgICAgICAgICAgLy8gVXBkYXRlIGh0bWwgZmlsZSB3aXRoIG5ld1xuICAgICAgICAgICAgLy8gc2NyaXB0IGFuZCBhc3NldCBmaWxlIHBhdGhzXG4gICAgICAgICAgICBtdXRhdGVKc0VudHJpZXMoJClcbiAgICAgICAgICAgIGpzRm5zLnJlZHVjZShtdXRhdGVKc0Fzc2V0cywgJClcbiAgICAgICAgICAgIGNzc0Zucy5yZWR1Y2UobXV0YXRlQ3NzSHJlZnMsICQpXG4gICAgICAgICAgICBpbWdGbnMucmVkdWNlKG11dGF0ZUltZ1NyY3MsICQpXG5cbiAgICAgICAgICAgIC8vIEFkZCBjdXN0b20gYXNzZXQgdG8gYnVuZGxlXG4gICAgICAgICAgICBidW5kbGVbaHRtbE5hbWVdID0ge1xuICAgICAgICAgICAgICBmaWxlTmFtZTogaHRtbE5hbWUsXG4gICAgICAgICAgICAgIGlzQXNzZXQ6IHRydWUsXG4gICAgICAgICAgICAgIHNvdXJjZTogJC5odG1sKCksXG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSxcbiAgICAgICAgKSxcbiAgICAgIClcbiAgICB9LFxuICB9XG59XG4iLCJleHBvcnQgY29uc3QgbWFwT2JqZWN0VmFsdWVzID0gKG9iaiwgZm4pID0+XG4gIE9iamVjdC5lbnRyaWVzKG9iaikucmVkdWNlKChyLCBba2V5LCB2YWx1ZV0pID0+IHtcbiAgICBpZiAodHlwZW9mIHZhbHVlICE9PSAnb2JqZWN0Jykge1xuICAgICAgLy8gaXMgcHJpbWl0aXZlXG4gICAgICByZXR1cm4geyAuLi5yLCBba2V5XTogZm4odmFsdWUpIH1cbiAgICB9IGVsc2UgaWYgKEFycmF5LmlzQXJyYXkodmFsdWUpKSB7XG4gICAgICAvLyBpcyBhcnJheVxuICAgICAgcmV0dXJuIHsgLi4uciwgW2tleV06IHZhbHVlLm1hcChmbikgfVxuICAgIH0gZWxzZSB7XG4gICAgICAvLyBpcyBwbGFpbiBvYmplY3RcbiAgICAgIHJldHVybiB7IC4uLnIsIFtrZXldOiBtYXBPYmplY3RWYWx1ZXModmFsdWUsIGZuKSB9XG4gICAgfVxuICB9LCB7fSlcbiIsImltcG9ydCB7XG4gIGRlcml2ZUVudHJpZXMsXG4gIGRlcml2ZU1hbmlmZXN0LFxuICBkZXJpdmVQZXJtaXNzaW9ucyBhcyBkcCxcbn0gZnJvbSAnQGJ1bWJsZS9tYW5pZmVzdCdcbmltcG9ydCBmcyBmcm9tICdmcy1leHRyYSdcbmltcG9ydCBpc1ZhbGlkUGF0aCBmcm9tICdpcy12YWxpZC1wYXRoJ1xuaW1wb3J0IE1hZ2ljU3RyaW5nIGZyb20gJ21hZ2ljLXN0cmluZydcbmltcG9ydCBtZW1vaXplIGZyb20gJ21lbSdcbmltcG9ydCBwYXRoIGZyb20gJ3BhdGgnXG5pbXBvcnQgcG0gZnJvbSAncGljb21hdGNoJ1xuaW1wb3J0IHsgY3JlYXRlRmlsdGVyIH0gZnJvbSAncm9sbHVwLXBsdWdpbnV0aWxzJ1xuaW1wb3J0IHsgZ2V0QXNzZXRQYXRoTWFwRm5zLCBsb2FkQXNzZXREYXRhIH0gZnJvbSAnLi4vaGVscGVycydcbmltcG9ydCB7IG1hcE9iamVjdFZhbHVlcyB9IGZyb20gJy4vbWFwT2JqZWN0VmFsdWVzJ1xuXG5jb25zdCBuYW1lID0gJ21hbmlmZXN0LWlucHV0J1xuXG4vKiAtLS0tIHByZWRpY2F0ZSBvYmplY3QgZm9yIGRlcml2ZUVudHJpZXMgLS0tLSAqL1xuLy8gY29uc3QgcHJlZE9iaiA9IHtcbi8vICAganM6IHMgPT4gL1xcLmpzJC8udGVzdChzKSxcbi8vICAgY3NzOiBzID0+IC9cXC5jc3MkLy50ZXN0KHMpLFxuLy8gICBodG1sOiBzID0+IC9cXC5odG1sJC8udGVzdChzKSxcbi8vICAgaW1nOiBzID0+IC9cXC5wbmckLy50ZXN0KHMpLFxuLy8gICBmaWx0ZXI6IHYgPT5cbi8vICAgICB0eXBlb2YgdiA9PT0gJ3N0cmluZycgJiZcbi8vICAgICB2LmluY2x1ZGVzKCcuJykgJiZcbi8vICAgICAhdi5pbmNsdWRlcygnKicpICYmXG4vLyAgICAgIS9eaHR0cHM/Oi8udGVzdCh2KSxcbi8vIH1cblxuY29uc3QgbnBtUGtnRGV0YWlscyA9IHtcbiAgbmFtZTogcHJvY2Vzcy5lbnYubnBtX3BhY2thZ2VfbmFtZSxcbiAgdmVyc2lvbjogcHJvY2Vzcy5lbnYubnBtX3BhY2thZ2VfdmVyc2lvbixcbiAgZGVzY3JpcHRpb246IHByb2Nlc3MuZW52Lm5wbV9wYWNrYWdlX2Rlc2NyaXB0aW9uLFxufVxuXG4vKiA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PSAqL1xuLyogICAgICAgICAgICAgICAgTUFOSUZFU1QtSU5QVVQgICAgICAgICAgICAgICAgKi9cbi8qID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09ICovXG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKHtcbiAgcGtnLFxuICB2ZXJib3NlLFxuICBwZXJtaXNzaW9ucyA9IHt9LFxuICBhc3NldHMgPSB7XG4gICAgaW5jbHVkZTogWycqKi8qLnBuZycsICcqKi8qLmNzcyddLFxuICB9LFxuICBlbnRyaWVzID0ge1xuICAgIGluY2x1ZGU6IFsnKiovKiddLFxuICB9LFxuICBpaWFmZSA9IHtcbiAgICAvLyBpbmNsdWRlIGlzIGRlZmF1bHRlZCB0byBbXSwgc28gZXhjbHVkZSBjYW4gYmUgdXNlZCBieSBpdHNlbGZcbiAgfSxcbiAgcHVibGljS2V5LFxuICB1c2VSZWxvYWRlciA9IHByb2Nlc3MuZW52LlJPTExVUF9XQVRDSCxcbiAgcmVsb2FkZXIsXG59ID0ge30pIHtcbiAgaWYgKCFwa2cpIHtcbiAgICBwa2cgPSBucG1Qa2dEZXRhaWxzXG4gIH1cblxuICBsZXQgX3VzZVJlbG9hZGVyID0gdXNlUmVsb2FkZXIgJiYgcmVsb2FkZXJcbiAgbGV0IHN0YXJ0UmVsb2FkZXIgPSB0cnVlXG5cbiAgLyogLS0tLS0tLS0tLS0tLS0gaG9va3MgY2xvc3VyZXMgLS0tLS0tLS0tLS0tLS0gKi9cbiAgaWlhZmUuaW5jbHVkZSA9IGlpYWZlLmluY2x1ZGUgfHwgW11cbiAgbGV0IGlpYWZlRmlsdGVyXG5cbiAgbGV0IGxvYWRlZEFzc2V0c1xuICBsZXQgc3JjRGlyXG5cbiAgbGV0IG1hbmlmZXN0UGF0aFxuXG4gIGNvbnN0IGNhY2hlID0ge31cblxuICBjb25zdCBtYW5pZmVzdE5hbWUgPSAnbWFuaWZlc3QuanNvbidcblxuICBjb25zdCBwZXJtaXNzaW9uc0ZpbHRlciA9IHBtKFxuICAgIHBlcm1pc3Npb25zLmluY2x1ZGUgfHwgJyoqLyonLFxuICAgIHBlcm1pc3Npb25zLmV4Y2x1ZGUsXG4gIClcblxuICBjb25zdCBhc3NldEZpbHRlciA9IHBtKGFzc2V0cy5pbmNsdWRlLCB7XG4gICAgaWdub3JlOiBhc3NldHMuZXhjbHVkZSxcbiAgfSlcblxuICBjb25zdCBlbnRyeUZpbHRlciA9IHBtKGVudHJpZXMuaW5jbHVkZSwge1xuICAgIGlnbm9yZTogZW50cmllcy5leGNsdWRlLFxuICB9KVxuXG4gIGNvbnN0IGRlcml2ZVBlcm1pc3Npb25zID0gbWVtb2l6ZShkcClcblxuICAvKiAtLS0tLS0tLS0tLS0tLS0gcGx1Z2luIG9iamVjdCAtLS0tLS0tLS0tLS0tLSAqL1xuICByZXR1cm4ge1xuICAgIG5hbWUsXG5cbiAgICAvKiA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PSAqL1xuICAgIC8qICAgICAgICAgICAgICAgICBPUFRJT05TIEhPT0sgICAgICAgICAgICAgICAgICovXG4gICAgLyogPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0gKi9cblxuICAgIG9wdGlvbnMob3B0aW9ucykge1xuICAgICAgLy8gRG8gbm90IHJlbG9hZCBtYW5pZmVzdCB3aXRob3V0IGNoYW5nZXNcbiAgICAgIGlmIChjYWNoZS5tYW5pZmVzdCkge1xuICAgICAgICByZXR1cm4geyAuLi5vcHRpb25zLCBpbnB1dDogY2FjaGUuaW5wdXQgfVxuICAgICAgfVxuXG4gICAgICBtYW5pZmVzdFBhdGggPSBvcHRpb25zLmlucHV0XG4gICAgICBzcmNEaXIgPSBwYXRoLmRpcm5hbWUobWFuaWZlc3RQYXRoKVxuXG4gICAgICAvLyBDaGVjayB0aGF0IGlucHV0IGlzIG1hbmlmZXN0Lmpzb25cbiAgICAgIGlmICghbWFuaWZlc3RQYXRoLmVuZHNXaXRoKG1hbmlmZXN0TmFtZSkpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcbiAgICAgICAgICBgJHtuYW1lfTogaW5wdXQgaXMgbm90IG1hbmlmZXN0Lmpzb25gLFxuICAgICAgICApXG4gICAgICB9XG5cbiAgICAgIC8vIExvYWQgbWFuaWZlc3QuanNvblxuICAgICAgY2FjaGUubWFuaWZlc3QgPSBmcy5yZWFkSlNPTlN5bmMobWFuaWZlc3RQYXRoKVxuXG4gICAgICAvLyBEZXJpdmUgZW50cnkgcGF0aHMgZnJvbSBtYW5pZmVzdFxuICAgICAgY29uc3QgeyBhc3NldFBhdGhzLCBlbnRyeVBhdGhzIH0gPSBkZXJpdmVFbnRyaWVzKFxuICAgICAgICBjYWNoZS5tYW5pZmVzdCxcbiAgICAgICAge1xuICAgICAgICAgIGFzc2V0UGF0aHM6IGFzc2V0RmlsdGVyLFxuICAgICAgICAgIGVudHJ5UGF0aHM6IGVudHJ5RmlsdGVyLFxuICAgICAgICAgIHRyYW5zZm9ybTogKG5hbWUpID0+IHBhdGguam9pbihzcmNEaXIsIG5hbWUpLFxuICAgICAgICAgIGZpbHRlcjogKHYpID0+XG4gICAgICAgICAgICB0eXBlb2YgdiA9PT0gJ3N0cmluZycgJiZcbiAgICAgICAgICAgIGlzVmFsaWRQYXRoKHYpICYmXG4gICAgICAgICAgICAhL15odHRwcz86Ly50ZXN0KHYpLFxuICAgICAgICB9LFxuICAgICAgKVxuXG4gICAgICAvLyBTdGFydCBhc3luYyBhc3NldCBsb2FkaW5nXG4gICAgICAvLyBDT05DRVJOOiByZWxhdGl2ZSBwYXRocyB3aXRoaW4gQ1NTIGZpbGVzIHdpbGwgZmFpbFxuICAgICAgLy8gU09MVVRJT046IHVzZSBwb3N0Y3NzIHRvIHByb2Nlc3MgQ1NTIGFzc2V0IHNyY1xuICAgICAgbG9hZGVkQXNzZXRzID0gUHJvbWlzZS5hbGwoYXNzZXRQYXRocy5tYXAobG9hZEFzc2V0RGF0YSkpXG5cbiAgICAgIC8vIFJlbmRlciBvbmx5IG1hbmlmZXN0IGVudHJ5IGpzIGZpbGVzXG4gICAgICAvLyBhcyBhc3luYyBpaWZlXG4gICAgICBjb25zdCBqcyA9IGVudHJ5UGF0aHMuZmlsdGVyKChwKSA9PiAvXFwuanMkLy50ZXN0KHApKVxuICAgICAgaWlhZmVGaWx0ZXIgPSBjcmVhdGVGaWx0ZXIoXG4gICAgICAgIGlpYWZlLmluY2x1ZGUuY29uY2F0KGpzKSxcbiAgICAgICAgaWlhZmUuZXhjbHVkZSxcbiAgICAgIClcblxuICAgICAgLy8gQ2FjaGUgZGVyaXZlZCBpbnB1dHNcbiAgICAgIGNhY2hlLmlucHV0ID0gZW50cnlQYXRoc1xuXG4gICAgICByZXR1cm4geyAuLi5vcHRpb25zLCBpbnB1dDogY2FjaGUuaW5wdXQgfVxuICAgIH0sXG5cbiAgICAvKiA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PSAqL1xuICAgIC8qICAgICAgICAgICAgICBIQU5ETEUgV0FUQ0ggRklMRVMgICAgICAgICAgICAgICovXG4gICAgLyogPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0gKi9cblxuICAgIGFzeW5jIGJ1aWxkU3RhcnQoKSB7XG4gICAgICB0aGlzLmFkZFdhdGNoRmlsZShtYW5pZmVzdFBhdGgpXG4gICAgfSxcblxuICAgIHdhdGNoQ2hhbmdlKGlkKSB7XG4gICAgICBpZiAoaWQuZW5kc1dpdGgobWFuaWZlc3ROYW1lKSkge1xuICAgICAgICAvLyBEdW1wIGNhY2hlLm1hbmlmZXN0IGlmIG1hbmlmZXN0Lmpzb24gY2hhbmdlc1xuICAgICAgICBjYWNoZS5tYW5pZmVzdCA9IG51bGxcbiAgICAgIH1cbiAgICB9LFxuXG4gICAgLyogPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0gKi9cbiAgICAvKiAgICAgICAgICAgICAgICAgICBUUkFOU0ZPUk0gICAgICAgICAgICAgICAgICAqL1xuICAgIC8qID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09ICovXG5cbiAgICAvLyB0cmFuc2Zvcm0oY29kZSwgaWQpIHt9LFxuXG4gICAgLyogPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0gKi9cbiAgICAvKiAgICAgICBNQUtFIE1BTklGRVNUIEVOVFJJRVMgQVNZTkMgSUlGRSAgICAgICAqL1xuICAgIC8qID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09ICovXG5cbiAgICByZW5kZXJDaHVuayhcbiAgICAgIHNvdXJjZSxcbiAgICAgIHsgaXNFbnRyeSwgZmFjYWRlTW9kdWxlSWQ6IGlkLCBmaWxlTmFtZSB9LFxuICAgICAgeyBzb3VyY2VtYXAgfSxcbiAgICApIHtcbiAgICAgIGlmICghaXNFbnRyeSB8fCAhaWlhZmVGaWx0ZXIoaWQpKSByZXR1cm4gbnVsbFxuXG4gICAgICAvLyB0dXJuIGVzIGltcG9ydHMgdG8gZHluYW1pYyBpbXBvcnRzXG4gICAgICBjb25zdCBjb2RlID0gc291cmNlLnJlcGxhY2UoXG4gICAgICAgIC9eaW1wb3J0ICguKykgZnJvbSAoJy4rPycpOyQvZ20sXG4gICAgICAgIChsaW5lLCAkMSwgJDIpID0+IHtcbiAgICAgICAgICBjb25zdCBhc2cgPSAkMS5yZXBsYWNlKFxuICAgICAgICAgICAgLyg/PD1cXHsuKykoIGFzICkoPz0uKz9cXH0pL2csXG4gICAgICAgICAgICAnOiAnLFxuICAgICAgICAgIClcbiAgICAgICAgICByZXR1cm4gYGNvbnN0ICR7YXNnfSA9IGF3YWl0IGltcG9ydCgkeyQyfSk7YFxuICAgICAgICB9LFxuICAgICAgKVxuXG4gICAgICBjb25zdCBtYWdpYyA9IG5ldyBNYWdpY1N0cmluZyhjb2RlKVxuXG4gICAgICAvLyBBc3luYyBJSUZFLWZ5XG4gICAgICBtYWdpY1xuICAgICAgICAuaW5kZW50KCcgICcpXG4gICAgICAgIC5wcmVwZW5kKCcoYXN5bmMgKCkgPT4ge1xcbicpXG4gICAgICAgIC5hcHBlbmQoJ1xcbn0pKCk7XFxuJylcblxuICAgICAgLy8gR2VuZXJhdGUgc291cmNlbWFwc1xuICAgICAgcmV0dXJuIHNvdXJjZW1hcFxuICAgICAgICA/IHtcbiAgICAgICAgICAgIGNvZGU6IG1hZ2ljLnRvU3RyaW5nKCksXG4gICAgICAgICAgICBtYXA6IG1hZ2ljLmdlbmVyYXRlTWFwKHtcbiAgICAgICAgICAgICAgc291cmNlOiBmaWxlTmFtZSxcbiAgICAgICAgICAgICAgaGlyZXM6IHRydWUsXG4gICAgICAgICAgICB9KSxcbiAgICAgICAgICB9XG4gICAgICAgIDogeyBjb2RlOiBtYWdpYy50b1N0cmluZygpIH1cbiAgICB9LFxuXG4gICAgLyogPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0gKi9cbiAgICAvKiAgICAgICAgICAgICAgICBHRU5FUkFURUJVTkRMRSAgICAgICAgICAgICAgICAqL1xuICAgIC8qID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09ICovXG5cbiAgICBhc3luYyBnZW5lcmF0ZUJ1bmRsZShvcHRpb25zLCBidW5kbGUpIHtcbiAgICAgIC8vIEdldCBtb2R1bGUgaWRzIGZvciBhbGwgY2h1bmtzXG4gICAgICBjb25zdCBwZXJtaXNzaW9ucyA9IEFycmF5LmZyb20oXG4gICAgICAgIE9iamVjdC52YWx1ZXMoYnVuZGxlKS5yZWR1Y2UoXG4gICAgICAgICAgKHNldCwgeyBjb2RlLCBmYWNhZGVNb2R1bGVJZDogaWQgfSkgPT4ge1xuICAgICAgICAgICAgLy8gVGhlIG9ubHkgdXNlIGZvciB0aGlzIGlzIHRvIGV4Y2x1ZGUgYSBjaHVua1xuICAgICAgICAgICAgaWYgKGlkICYmIHBlcm1pc3Npb25zRmlsdGVyKGlkKSkge1xuICAgICAgICAgICAgICByZXR1cm4gbmV3IFNldChbXG4gICAgICAgICAgICAgICAgLi4uZGVyaXZlUGVybWlzc2lvbnMoY29kZSksXG4gICAgICAgICAgICAgICAgLi4uc2V0LFxuICAgICAgICAgICAgICBdKVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgcmV0dXJuIHNldFxuICAgICAgICAgICAgfVxuICAgICAgICAgIH0sXG4gICAgICAgICAgbmV3IFNldCgpLFxuICAgICAgICApLFxuICAgICAgKVxuXG4gICAgICBpZiAodmVyYm9zZSkge1xuICAgICAgICAvLyBDb21wYXJlIHRvIGxhc3QgcGVybWlzc2lvbnNcbiAgICAgICAgY29uc3QgcGVybXNIYXNoID0gSlNPTi5zdHJpbmdpZnkocGVybWlzc2lvbnMpXG5cbiAgICAgICAgaWYgKCFjYWNoZS5wZXJtc0hhc2gpIHtcbiAgICAgICAgICBjb25zb2xlLmxvZygnRGVyaXZlZCBwZXJtaXNzaW9uczonLCBwZXJtaXNzaW9ucylcbiAgICAgICAgfSBlbHNlIGlmIChwZXJtc0hhc2ggIT09IGNhY2hlLnBlcm1zSGFzaCkge1xuICAgICAgICAgIGNvbnNvbGUubG9nKCdEZXJpdmVkIG5ldyBwZXJtaXNzaW9uczonLCBwZXJtaXNzaW9ucylcbiAgICAgICAgfVxuXG4gICAgICAgIGNhY2hlLnBlcm1zSGFzaCA9IHBlcm1zSGFzaFxuICAgICAgfVxuXG4gICAgICAvLyBFbWl0IGxvYWRlZCBhc3NldHMgYW5kXG4gICAgICAvLyBDcmVhdGUgYXNzZXQgcGF0aCB1cGRhdGVyc1xuICAgICAgY29uc3QgYXNzZXRQYXRoTWFwRm5zID0gYXdhaXQgZ2V0QXNzZXRQYXRoTWFwRm5zLmNhbGwoXG4gICAgICAgIHRoaXMsXG4gICAgICAgIGxvYWRlZEFzc2V0cyxcbiAgICAgIClcblxuICAgICAgdHJ5IHtcbiAgICAgICAgY29uc3QgbWFuaWZlc3RCb2R5ID0gZGVyaXZlTWFuaWZlc3QoXG4gICAgICAgICAgcGtnLFxuICAgICAgICAgIC8vIFVwZGF0ZSBhc3NldCBwYXRocyBhbmQgcmV0dXJuIG1hbmlmZXN0XG4gICAgICAgICAgYXNzZXRQYXRoTWFwRm5zLnJlZHVjZShcbiAgICAgICAgICAgIG1hcE9iamVjdFZhbHVlcyxcbiAgICAgICAgICAgIGNhY2hlLm1hbmlmZXN0LFxuICAgICAgICAgICksXG4gICAgICAgICAgcGVybWlzc2lvbnMsXG4gICAgICAgIClcblxuICAgICAgICAvLyBBZGQgcmVsb2FkZXIgc2NyaXB0XG4gICAgICAgIGlmIChfdXNlUmVsb2FkZXIpIHtcbiAgICAgICAgICBjb25zb2xlLmxvZygnX3VzZVJlbG9hZGVyJywgX3VzZVJlbG9hZGVyKVxuXG4gICAgICAgICAgaWYgKHN0YXJ0UmVsb2FkZXIpIHtcbiAgICAgICAgICAgIGF3YWl0IHJlbG9hZGVyLnN0YXJ0KChzaG91bGRTdGFydCkgPT4ge1xuICAgICAgICAgICAgICBzdGFydFJlbG9hZGVyID0gc2hvdWxkU3RhcnRcbiAgICAgICAgICAgIH0pXG5cbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdyZWxvYWRlciBpcyBydW5uaW5nLi4uJylcbiAgICAgICAgICB9XG5cbiAgICAgICAgICAvLyBUT0RPOiByZWxvYWRlciBzaG91bGQgYmUgd3JhcHBlZFxuICAgICAgICAgIC8vICAgICAgIGluIGEgZHluYW1pYyBpbXBvcnRcbiAgICAgICAgICAvLyAgICAgICB0byBzdXBwb3J0IG1vZHVsZSBmZWF0dXJlcy5cbiAgICAgICAgICBjb25zdCBjbGllbnRJZCA9IHRoaXMuZW1pdEFzc2V0KFxuICAgICAgICAgICAgJ3JlbG9hZGVyLWNsaWVudC5qcycsXG4gICAgICAgICAgICByZWxvYWRlci5nZXRDbGllbnRDb2RlKCksXG4gICAgICAgICAgKVxuXG4gICAgICAgICAgY29uc3QgY2xpZW50UGF0aCA9IHRoaXMuZ2V0QXNzZXRGaWxlTmFtZShjbGllbnRJZClcblxuICAgICAgICAgIC8vIFRPRE86IGhlcmUsIGNsaWVudCBwYXRoIHNob3VsZCBiZSB0aGUgd3JhcHBlciBmaWxlLlxuICAgICAgICAgIHJlbG9hZGVyLnVwZGF0ZU1hbmlmZXN0KG1hbmlmZXN0Qm9keSwgY2xpZW50UGF0aClcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChwdWJsaWNLZXkpIHtcbiAgICAgICAgICBtYW5pZmVzdEJvZHkua2V5ID0gcHVibGljS2V5XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgZGVsZXRlIG1hbmlmZXN0Qm9keS5rZXlcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIE11dGF0ZSBidW5kbGUgdG8gZW1pdCBjdXN0b20gYXNzZXRcbiAgICAgICAgYnVuZGxlW21hbmlmZXN0TmFtZV0gPSB7XG4gICAgICAgICAgZmlsZU5hbWU6IG1hbmlmZXN0TmFtZSxcbiAgICAgICAgICBpc0Fzc2V0OiB0cnVlLFxuICAgICAgICAgIHNvdXJjZTogSlNPTi5zdHJpbmdpZnkobWFuaWZlc3RCb2R5LCBudWxsLCAyKSxcbiAgICAgICAgfVxuICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgaWYgKGVycm9yLm5hbWUgIT09ICdWYWxpZGF0aW9uRXJyb3InKSB0aHJvdyBlcnJvclxuXG4gICAgICAgIGVycm9yLmVycm9ycy5mb3JFYWNoKChlcnIpID0+IHtcbiAgICAgICAgICBjb25zb2xlLmxvZyhlcnIpXG4gICAgICAgIH0pXG5cbiAgICAgICAgdGhpcy5lcnJvcihlcnJvci5tZXNzYWdlKVxuICAgICAgfVxuICAgIH0sXG5cbiAgICB3cml0ZUJ1bmRsZSgpIHtcbiAgICAgIGlmIChfdXNlUmVsb2FkZXIpIHtcbiAgICAgICAgcmV0dXJuIHJlbG9hZGVyLnJlbG9hZCgpLmNhdGNoKChlcnJvcikgPT4ge1xuICAgICAgICAgIGNvbnN0IG1lc3NhZ2UgPSBgJHtlcnJvci5tZXNzYWdlfSAoJHtlcnJvci5jb2RlfSlgXG4gICAgICAgICAgdGhpcy53YXJuKG1lc3NhZ2UpXG4gICAgICAgIH0pXG4gICAgICB9XG4gICAgfSxcbiAgfVxufVxuIiwiaW1wb3J0IGh0bWxJbnB1dHMgZnJvbSAnLi9odG1sLWlucHV0cy9pbmRleCdcbmltcG9ydCBtYW5pZmVzdElucHV0IGZyb20gJy4vbWFuaWZlc3QtaW5wdXQvaW5kZXgnXG5cbmV4cG9ydCBkZWZhdWx0IG9wdHMgPT4ge1xuICBjb25zdCBtYW5pZmVzdCA9IG1hbmlmZXN0SW5wdXQob3B0cylcbiAgY29uc3QgaHRtbCA9IGh0bWxJbnB1dHMob3B0cylcbiAgY29uc3QgcGx1Z2lucyA9IFttYW5pZmVzdCwgaHRtbF1cblxuICByZXR1cm4ge1xuICAgIG5hbWU6ICdjaHJvbWUtZXh0ZW5zaW9uJyxcblxuICAgIG9wdGlvbnMob3B0aW9ucykge1xuICAgICAgcmV0dXJuIHBsdWdpbnMucmVkdWNlKFxuICAgICAgICAobywgcCkgPT4gKHAub3B0aW9ucyA/IHAub3B0aW9ucy5jYWxsKHRoaXMsIG8pIDogbyksXG4gICAgICAgIG9wdGlvbnMsXG4gICAgICApXG4gICAgfSxcblxuICAgIGJ1aWxkU3RhcnQob3B0aW9ucykge1xuICAgICAgbWFuaWZlc3QuYnVpbGRTdGFydC5jYWxsKHRoaXMsIG9wdGlvbnMpXG4gICAgICBodG1sLmJ1aWxkU3RhcnQuY2FsbCh0aGlzLCBvcHRpb25zKVxuICAgIH0sXG5cbiAgICB3YXRjaENoYW5nZShpZCkge1xuICAgICAgbWFuaWZlc3Qud2F0Y2hDaGFuZ2UuY2FsbCh0aGlzLCBpZClcbiAgICAgIGh0bWwud2F0Y2hDaGFuZ2UuY2FsbCh0aGlzLCBpZClcbiAgICB9LFxuXG4gICAgcmVuZGVyQ2h1bmsoLi4uYXJncykge1xuICAgICAgcmV0dXJuIG1hbmlmZXN0LnJlbmRlckNodW5rLmNhbGwodGhpcywgLi4uYXJncylcbiAgICB9LFxuXG4gICAgYXN5bmMgZ2VuZXJhdGVCdW5kbGUoLi4uYXJncykge1xuICAgICAgY29uc3QgaG9vayA9ICdnZW5lcmF0ZUJ1bmRsZSdcblxuICAgICAgYXdhaXQgUHJvbWlzZS5hbGwoW1xuICAgICAgICBtYW5pZmVzdFtob29rXS5jYWxsKHRoaXMsIC4uLmFyZ3MpLFxuICAgICAgICBodG1sW2hvb2tdLmNhbGwodGhpcywgLi4uYXJncyksXG4gICAgICBdKVxuICAgIH0sXG5cbiAgICB3cml0ZUJ1bmRsZSgpIHtcbiAgICAgIG1hbmlmZXN0LndyaXRlQnVuZGxlLmNhbGwodGhpcylcbiAgICB9LFxuICB9XG59XG4iXSwibmFtZXMiOlsibmFtZSIsImRwIiwiZGVyaXZlRW50cmllcyIsImNyZWF0ZUZpbHRlciIsImRlcml2ZU1hbmlmZXN0Il0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7OztBQUtPLE1BQU0sYUFBYSxHQUFHLFNBQVM7RUFDcEMsRUFBRSxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUMsU0FBUyxFQUFFLEdBQUcsQ0FBQyxFQUFDOztBQUV0RCxBQUFPLE1BQU0sU0FBUyxHQUFHLENBQUMsRUFBRSxFQUFFLEVBQUUsS0FBSyxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQzs7QUFFakUsQUFBTyxlQUFlLGtCQUFrQixDQUFDLE1BQU0sRUFBRTtFQUMvQyxPQUFPLENBQUMsTUFBTSxNQUFNLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxTQUFTLEVBQUUsUUFBUSxDQUFDLEtBQUs7SUFDbkQsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxTQUFTLEVBQUM7SUFDckMsTUFBTSxFQUFFLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsUUFBUSxFQUFDO0lBQ3pDLE1BQU0sYUFBYSxHQUFHLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxFQUFFLEVBQUM7O0lBRS9DLE9BQU8sQ0FBQyxJQUFJO01BQ1YsSUFBSSxPQUFPLENBQUMsS0FBSyxRQUFRLEVBQUUsT0FBTyxDQUFDOztNQUVuQyxJQUFJLFNBQVMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLEVBQUU7UUFDekIsT0FBTyxhQUFhO09BQ3JCLE1BQU07UUFDTCxPQUFPLENBQUM7T0FDVDtLQUNGO0dBQ0YsQ0FBQztDQUNIOztBQ3RCTSxNQUFNLFFBQVEsR0FBRyxDQUFDLFFBQVEsS0FBSztFQUNwQyxNQUFNLFFBQVEsR0FBRyxFQUFFLENBQUMsWUFBWSxDQUFDLFFBQVEsRUFBRSxNQUFNLEVBQUM7RUFDbEQsTUFBTSxDQUFDLEdBQUcsT0FBTyxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUM7O0VBRWhDLE9BQU8sQ0FBQztFQUNUOztBQUVELE1BQU0sZUFBZSxHQUFHLENBQUMsUUFBUSxLQUFLLENBQUMsQ0FBQztFQUN0QyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxFQUFDOztBQUV0QyxNQUFNLFVBQVUsR0FBRyxDQUFDLENBQUM7RUFDbkIsQ0FBQyxDQUFDLFFBQVEsQ0FBQztLQUNSLEdBQUcsQ0FBQyxxQkFBcUIsQ0FBQztLQUMxQixHQUFHLENBQUMsZ0JBQWdCLENBQUM7S0FDckIsR0FBRyxDQUFDLGlCQUFpQixDQUFDO0tBQ3RCLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQztLQUNyQixHQUFHLENBQUMsWUFBWSxDQUFDO0tBQ2pCLE9BQU8sR0FBRTs7QUFFZCxBQUFPLE1BQU0sWUFBWSxHQUFHLENBQUMsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDO0VBQ3hDLFVBQVUsQ0FBQyxDQUFDLENBQUM7S0FDVixHQUFHLENBQUMsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztLQUNsQyxHQUFHLENBQUMsZUFBZSxDQUFDLFFBQVEsQ0FBQyxFQUFDOztBQUVuQyxBQUFPLE1BQU0sZUFBZSxHQUFHLENBQUMsQ0FBQyxLQUFLO0VBQ3BDLFVBQVUsQ0FBQyxDQUFDLENBQUM7S0FDVixHQUFHLENBQUMsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDO0tBQ3RCLE9BQU8sQ0FBQyxDQUFDLENBQUMsS0FBSztNQUNkLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLFFBQVEsRUFBQztLQUN6QixFQUFDOztFQUVKLE9BQU8sQ0FBQztFQUNUOzs7O0FBSUQsTUFBTSxTQUFTLEdBQUcsQ0FBQyxDQUFDO0VBQ2xCLENBQUMsQ0FBQyxRQUFRLENBQUM7S0FDUixNQUFNLENBQUMsNEJBQTRCLENBQUM7S0FDcEMsR0FBRyxDQUFDLGdCQUFnQixDQUFDO0tBQ3JCLEdBQUcsQ0FBQyxpQkFBaUIsQ0FBQztLQUN0QixHQUFHLENBQUMsZ0JBQWdCLENBQUM7S0FDckIsR0FBRyxDQUFDLFlBQVksQ0FBQztLQUNqQixPQUFPLEdBQUU7O0FBRWQsQUFBTyxNQUFNLFdBQVcsR0FBRyxDQUFDLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQztFQUN2QyxTQUFTLENBQUMsQ0FBQyxDQUFDO0tBQ1QsR0FBRyxDQUFDLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7S0FDbEMsR0FBRyxDQUFDLGVBQWUsQ0FBQyxRQUFRLENBQUMsRUFBQzs7QUFFbkMsQUFBTyxNQUFNLGNBQWMsR0FBRyxDQUFDLENBQUMsRUFBRSxFQUFFLEtBQUs7RUFDdkMsU0FBUyxDQUFDLENBQUMsQ0FBQztLQUNULEdBQUcsQ0FBQyxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUM7S0FDdEIsT0FBTyxDQUFDLENBQUMsQ0FBQyxLQUFLO01BQ2QsTUFBTSxLQUFLLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEVBQUM7TUFDL0IsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsS0FBSyxFQUFDO0tBQ3JCLEVBQUM7O0VBRUosT0FBTyxDQUFDO0VBQ1Q7Ozs7QUFJRCxNQUFNLE1BQU0sR0FBRyxDQUFDLENBQUM7RUFDZixDQUFDLENBQUMsTUFBTSxDQUFDO0tBQ04sTUFBTSxDQUFDLG9CQUFvQixDQUFDO0tBQzVCLEdBQUcsQ0FBQyxpQkFBaUIsQ0FBQztLQUN0QixHQUFHLENBQUMsa0JBQWtCLENBQUM7S0FDdkIsR0FBRyxDQUFDLGlCQUFpQixDQUFDO0tBQ3RCLEdBQUcsQ0FBQyxhQUFhLENBQUM7S0FDbEIsT0FBTyxHQUFFOztBQUVkLEFBQU8sTUFBTSxXQUFXLEdBQUcsQ0FBQyxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUM7RUFDdkMsTUFBTSxDQUFDLENBQUMsQ0FBQztLQUNOLEdBQUcsQ0FBQyxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0tBQ25DLEdBQUcsQ0FBQyxlQUFlLENBQUMsUUFBUSxDQUFDLEVBQUM7O0FBRW5DLEFBQU8sTUFBTSxjQUFjLEdBQUcsQ0FBQyxDQUFDLEVBQUUsRUFBRSxLQUFLO0VBQ3ZDLE1BQU0sQ0FBQyxDQUFDLENBQUM7S0FDTixHQUFHLENBQUMsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDO0tBQ3RCLE9BQU8sQ0FBQyxDQUFDLENBQUMsS0FBSztNQUNkLE1BQU0sS0FBSyxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxFQUFDO01BQ2hDLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLEtBQUssRUFBQztLQUN0QixFQUFDOztFQUVKLE9BQU8sQ0FBQztFQUNUOzs7QUFHRCxNQUFNLE9BQU8sR0FBRyxDQUFDLENBQUM7RUFDaEIsQ0FBQyxDQUFDLEtBQUssQ0FBQztLQUNMLEdBQUcsQ0FBQyxrQkFBa0IsQ0FBQztLQUN2QixHQUFHLENBQUMsbUJBQW1CLENBQUM7S0FDeEIsR0FBRyxDQUFDLGdCQUFnQixDQUFDO0tBQ3JCLEdBQUcsQ0FBQyxZQUFZLENBQUM7S0FDakIsT0FBTyxHQUFFOztBQUVkLE1BQU0sV0FBVyxHQUFHLENBQUMsQ0FBQztFQUNwQixDQUFDLENBQUMsa0JBQWtCLENBQUM7S0FDbEIsR0FBRyxDQUFDLGlCQUFpQixDQUFDO0tBQ3RCLEdBQUcsQ0FBQyxrQkFBa0IsQ0FBQztLQUN2QixHQUFHLENBQUMsaUJBQWlCLENBQUM7S0FDdEIsR0FBRyxDQUFDLGFBQWEsQ0FBQztLQUNsQixPQUFPLEdBQUU7O0FBRWQsQUFBTyxNQUFNLFVBQVUsR0FBRyxDQUFDLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQyxLQUFLO0VBQzNDLE9BQU87SUFDTCxHQUFHLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQzs7SUFFaEQsR0FBRyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7R0FDdEQsQ0FBQyxHQUFHLENBQUMsZUFBZSxDQUFDLFFBQVEsQ0FBQyxDQUFDO0VBQ2pDOztBQUVELEFBQU8sTUFBTSxhQUFhLEdBQUcsQ0FBQyxDQUFDLEVBQUUsRUFBRSxLQUFLO0VBQ3RDLE9BQU8sQ0FBQyxDQUFDLENBQUM7S0FDUCxHQUFHLENBQUMsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDO0tBQ3RCLE9BQU8sQ0FBQyxDQUFDLENBQUMsS0FBSztNQUNkLE1BQU0sS0FBSyxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxFQUFDO01BQy9CLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLEtBQUssRUFBQztLQUNyQixFQUFDOztFQUVKLFdBQVcsQ0FBQyxDQUFDLENBQUM7S0FDWCxHQUFHLENBQUMsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDO0tBQ3RCLE9BQU8sQ0FBQyxDQUFDLENBQUMsS0FBSztNQUNkLE1BQU0sS0FBSyxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxFQUFDO01BQ2hDLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLEtBQUssRUFBQztLQUN0QixFQUFDOztFQUVKLE9BQU8sQ0FBQztDQUNUOztBQ2xJRDs7QUFFQSxBQUFPLE1BQU0sR0FBRyxHQUFHLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFDOztBQUVwQyxBQUFPLE1BQU0sTUFBTSxHQUFHLElBQUksSUFBSSxVQUFVLENBQUMsSUFBSSxDQUFDLElBQUksRUFBQzs7QUFFbkQsQUFBTyxNQUFNLGNBQWMsR0FBRyxRQUFRO0VBQ3BDLE9BQU8sQ0FBQyxHQUFHO0lBQ1QsUUFBUSxDQUFDLEdBQUcsQ0FBQyxNQUFNLElBQUk7TUFDckIsSUFBSSxDQUFDLE1BQU0sQ0FBQztRQUNWLEVBQUUsRUFBRSxNQUFNLE9BQU8sQ0FBQyxHQUFHO1VBQ25CLFdBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsYUFBYSxDQUFDO1NBQ3JDO1FBQ0QsR0FBRyxFQUFFLE1BQU0sT0FBTyxDQUFDLEdBQUc7VUFDcEIsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxhQUFhLENBQUM7U0FDcEM7UUFDRCxHQUFHLEVBQUUsTUFBTSxPQUFPLENBQUMsR0FBRztVQUNwQixXQUFXLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLGFBQWEsQ0FBQztTQUNyQztPQUNGLENBQUM7S0FDSDtHQUNGOztBQ1pILE1BQU0sSUFBSSxHQUFHLGNBQWE7Ozs7OztBQU0xQixBQUFlLFNBQVMsVUFBVSxHQUFHOzs7RUFHbkMsTUFBTSxLQUFLLEdBQUcsR0FBRTs7O0VBR2hCLElBQUksV0FBVTtFQUNkLElBQUksVUFBUzs7O0VBR2IsT0FBTztJQUNMLElBQUk7Ozs7OztJQU1KLE9BQU8sQ0FBQyxPQUFPLEVBQUU7O01BRWYsSUFBSSxLQUFLLENBQUMsS0FBSyxFQUFFO1FBQ2YsT0FBTztVQUNMLEdBQUcsT0FBTztVQUNWLEtBQUssRUFBRSxLQUFLLENBQUMsS0FBSztTQUNuQjtPQUNGOzs7TUFHRCxJQUFJLE9BQU8sT0FBTyxDQUFDLEtBQUssS0FBSyxRQUFRLEVBQUU7UUFDckMsT0FBTyxDQUFDLEtBQUssR0FBRyxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUM7T0FDaEM7OztNQUdELEtBQUssQ0FBQyxTQUFTLEdBQUcsT0FBTyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFDOzs7TUFHOUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsTUFBTSxFQUFFO1FBQzNCLFVBQVUsR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLEVBQUUsRUFBQztRQUNoQyxPQUFPLE9BQU87T0FDZjs7OztNQUlELE1BQU0sS0FBSyxHQUFHLEtBQUssQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBQzs7TUFFM0MsTUFBTSxRQUFRLEdBQUcsU0FBUyxDQUFDLEtBQUssQ0FBQyxTQUFTLEVBQUUsS0FBSyxFQUFDOzs7O01BSWxELFVBQVUsR0FBRyxjQUFjLENBQUMsUUFBUSxFQUFDOzs7TUFHckMsU0FBUyxHQUFHLFFBQVEsQ0FBQyxPQUFPLENBQUMsWUFBWSxFQUFDOzs7TUFHMUMsS0FBSyxDQUFDLEtBQUssR0FBRyxPQUFPLENBQUMsS0FBSztTQUN4QixNQUFNLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1NBQ25CLE1BQU0sQ0FBQyxTQUFTLEVBQUM7O01BRXBCLE9BQU87UUFDTCxHQUFHLE9BQU87UUFDVixLQUFLLEVBQUUsS0FBSyxDQUFDLEtBQUs7T0FDbkI7S0FDRjs7Ozs7O0lBTUQsVUFBVSxHQUFHO01BQ1gsS0FBSyxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxRQUFRLEtBQUs7UUFDcEMsSUFBSSxDQUFDLFlBQVksQ0FBQyxRQUFRLEVBQUM7T0FDNUIsRUFBQztLQUNIOztJQUVELFdBQVcsQ0FBQyxFQUFFLEVBQUU7TUFDZCxJQUFJLEVBQUUsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLEVBQUU7UUFDeEIsS0FBSyxDQUFDLEtBQUssR0FBRyxLQUFJO09BQ25CO0tBQ0Y7Ozs7OztJQU1ELE1BQU0sY0FBYyxDQUFDLE9BQU8sRUFBRSxNQUFNLEVBQUU7OztNQUdwQyxNQUFNLE9BQU8sQ0FBQyxHQUFHO1FBQ2YsQ0FBQyxNQUFNLFVBQVUsRUFBRSxHQUFHO1VBQ3BCLE9BQU8sQ0FBQyxRQUFRLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsQ0FBQyxLQUFLO1lBQ3pDLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFDOzs7WUFHeEMsTUFBTSxLQUFLLEdBQUcsTUFBTSxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLEVBQUUsRUFBQztZQUNyRCxNQUFNLE1BQU0sR0FBRyxNQUFNLGtCQUFrQixDQUFDLElBQUk7Y0FDMUMsSUFBSTtjQUNKLEdBQUc7Y0FDSjtZQUNELE1BQU0sTUFBTSxHQUFHLE1BQU0sa0JBQWtCLENBQUMsSUFBSTtjQUMxQyxJQUFJO2NBQ0osR0FBRztjQUNKOzs7O1lBSUQsZUFBZSxDQUFDLENBQUMsRUFBQztZQUNsQixLQUFLLENBQUMsTUFBTSxDQUFDLGNBQWMsRUFBRSxDQUFDLEVBQUM7WUFDL0IsTUFBTSxDQUFDLE1BQU0sQ0FBQyxjQUFjLEVBQUUsQ0FBQyxFQUFDO1lBQ2hDLE1BQU0sQ0FBQyxNQUFNLENBQUMsYUFBYSxFQUFFLENBQUMsRUFBQzs7O1lBRy9CLE1BQU0sQ0FBQyxRQUFRLENBQUMsR0FBRztjQUNqQixRQUFRLEVBQUUsUUFBUTtjQUNsQixPQUFPLEVBQUUsSUFBSTtjQUNiLE1BQU0sRUFBRSxDQUFDLENBQUMsSUFBSSxFQUFFO2NBQ2pCO1dBQ0Y7U0FDRjtRQUNGO0tBQ0Y7R0FDRjtDQUNGOztBQzNJTSxNQUFNLGVBQWUsR0FBRyxDQUFDLEdBQUcsRUFBRSxFQUFFO0VBQ3JDLE1BQU0sQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBRyxFQUFFLEtBQUssQ0FBQyxLQUFLO0lBQzlDLElBQUksT0FBTyxLQUFLLEtBQUssUUFBUSxFQUFFOztNQUU3QixPQUFPLEVBQUUsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEdBQUcsRUFBRSxDQUFDLEtBQUssQ0FBQyxFQUFFO0tBQ2xDLE1BQU0sSUFBSSxLQUFLLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxFQUFFOztNQUUvQixPQUFPLEVBQUUsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEdBQUcsS0FBSyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFBRTtLQUN0QyxNQUFNOztNQUVMLE9BQU8sRUFBRSxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsR0FBRyxlQUFlLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxFQUFFO0tBQ25EO0dBQ0YsRUFBRSxFQUFFLENBQUM7O0FDR1IsTUFBTUEsTUFBSSxHQUFHLGlCQUFnQjs7Ozs7Ozs7Ozs7Ozs7O0FBZTdCLE1BQU0sYUFBYSxHQUFHO0VBQ3BCLElBQUksRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLGdCQUFnQjtFQUNsQyxPQUFPLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxtQkFBbUI7RUFDeEMsV0FBVyxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsdUJBQXVCO0VBQ2pEOzs7Ozs7QUFNRCxBQUFlLHNCQUFRLENBQUM7RUFDdEIsR0FBRztFQUNILE9BQU87RUFDUCxXQUFXLEdBQUcsRUFBRTtFQUNoQixNQUFNLEdBQUc7SUFDUCxPQUFPLEVBQUUsQ0FBQyxVQUFVLEVBQUUsVUFBVSxDQUFDO0dBQ2xDO0VBQ0QsT0FBTyxHQUFHO0lBQ1IsT0FBTyxFQUFFLENBQUMsTUFBTSxDQUFDO0dBQ2xCO0VBQ0QsS0FBSyxHQUFHOztHQUVQO0VBQ0QsU0FBUztFQUNULFdBQVcsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLFlBQVk7RUFDdEMsUUFBUTtDQUNULEdBQUcsRUFBRSxFQUFFO0VBQ04sSUFBSSxDQUFDLEdBQUcsRUFBRTtJQUNSLEdBQUcsR0FBRyxjQUFhO0dBQ3BCOztFQUVELElBQUksWUFBWSxHQUFHLFdBQVcsSUFBSSxTQUFRO0VBQzFDLElBQUksYUFBYSxHQUFHLEtBQUk7OztFQUd4QixLQUFLLENBQUMsT0FBTyxHQUFHLEtBQUssQ0FBQyxPQUFPLElBQUksR0FBRTtFQUNuQyxJQUFJLFlBQVc7O0VBRWYsSUFBSSxhQUFZO0VBQ2hCLElBQUksT0FBTTs7RUFFVixJQUFJLGFBQVk7O0VBRWhCLE1BQU0sS0FBSyxHQUFHLEdBQUU7O0VBRWhCLE1BQU0sWUFBWSxHQUFHLGdCQUFlOztFQUVwQyxNQUFNLGlCQUFpQixHQUFHLEVBQUU7SUFDMUIsV0FBVyxDQUFDLE9BQU8sSUFBSSxNQUFNO0lBQzdCLFdBQVcsQ0FBQyxPQUFPO0lBQ3BCOztFQUVELE1BQU0sV0FBVyxHQUFHLEVBQUUsQ0FBQyxNQUFNLENBQUMsT0FBTyxFQUFFO0lBQ3JDLE1BQU0sRUFBRSxNQUFNLENBQUMsT0FBTztHQUN2QixFQUFDOztFQUVGLE1BQU0sV0FBVyxHQUFHLEVBQUUsQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFO0lBQ3RDLE1BQU0sRUFBRSxPQUFPLENBQUMsT0FBTztHQUN4QixFQUFDOztFQUVGLE1BQU0saUJBQWlCLEdBQUcsT0FBTyxDQUFDQywwQkFBRSxFQUFDOzs7RUFHckMsT0FBTztVQUNMRCxNQUFJOzs7Ozs7SUFNSixPQUFPLENBQUMsT0FBTyxFQUFFOztNQUVmLElBQUksS0FBSyxDQUFDLFFBQVEsRUFBRTtRQUNsQixPQUFPLEVBQUUsR0FBRyxPQUFPLEVBQUUsS0FBSyxFQUFFLEtBQUssQ0FBQyxLQUFLLEVBQUU7T0FDMUM7O01BRUQsWUFBWSxHQUFHLE9BQU8sQ0FBQyxNQUFLO01BQzVCLE1BQU0sR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLFlBQVksRUFBQzs7O01BR25DLElBQUksQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFDLFlBQVksQ0FBQyxFQUFFO1FBQ3hDLE1BQU0sSUFBSSxTQUFTO1VBQ2pCLENBQUMsRUFBRUEsTUFBSSxDQUFDLDRCQUE0QixDQUFDO1NBQ3RDO09BQ0Y7OztNQUdELEtBQUssQ0FBQyxRQUFRLEdBQUcsRUFBRSxDQUFDLFlBQVksQ0FBQyxZQUFZLEVBQUM7OztNQUc5QyxNQUFNLEVBQUUsVUFBVSxFQUFFLFVBQVUsRUFBRSxHQUFHRSxzQkFBYTtRQUM5QyxLQUFLLENBQUMsUUFBUTtRQUNkO1VBQ0UsVUFBVSxFQUFFLFdBQVc7VUFDdkIsVUFBVSxFQUFFLFdBQVc7VUFDdkIsU0FBUyxFQUFFLENBQUMsSUFBSSxLQUFLLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQztVQUM1QyxNQUFNLEVBQUUsQ0FBQyxDQUFDO1lBQ1IsT0FBTyxDQUFDLEtBQUssUUFBUTtZQUNyQixXQUFXLENBQUMsQ0FBQyxDQUFDO1lBQ2QsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztTQUN0QjtRQUNGOzs7OztNQUtELFlBQVksR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsYUFBYSxDQUFDLEVBQUM7Ozs7TUFJekQsTUFBTSxFQUFFLEdBQUcsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsS0FBSyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFDO01BQ3BELFdBQVcsR0FBR0MsOEJBQVk7UUFDeEIsS0FBSyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDO1FBQ3hCLEtBQUssQ0FBQyxPQUFPO1FBQ2Q7OztNQUdELEtBQUssQ0FBQyxLQUFLLEdBQUcsV0FBVTs7TUFFeEIsT0FBTyxFQUFFLEdBQUcsT0FBTyxFQUFFLEtBQUssRUFBRSxLQUFLLENBQUMsS0FBSyxFQUFFO0tBQzFDOzs7Ozs7SUFNRCxNQUFNLFVBQVUsR0FBRztNQUNqQixJQUFJLENBQUMsWUFBWSxDQUFDLFlBQVksRUFBQztLQUNoQzs7SUFFRCxXQUFXLENBQUMsRUFBRSxFQUFFO01BQ2QsSUFBSSxFQUFFLENBQUMsUUFBUSxDQUFDLFlBQVksQ0FBQyxFQUFFOztRQUU3QixLQUFLLENBQUMsUUFBUSxHQUFHLEtBQUk7T0FDdEI7S0FDRjs7Ozs7Ozs7Ozs7O0lBWUQsV0FBVztNQUNULE1BQU07TUFDTixFQUFFLE9BQU8sRUFBRSxjQUFjLEVBQUUsRUFBRSxFQUFFLFFBQVEsRUFBRTtNQUN6QyxFQUFFLFNBQVMsRUFBRTtNQUNiO01BQ0EsSUFBSSxDQUFDLE9BQU8sSUFBSSxDQUFDLFdBQVcsQ0FBQyxFQUFFLENBQUMsRUFBRSxPQUFPLElBQUk7OztNQUc3QyxNQUFNLElBQUksR0FBRyxNQUFNLENBQUMsT0FBTztRQUN6QiwrQkFBK0I7UUFDL0IsQ0FBQyxJQUFJLEVBQUUsRUFBRSxFQUFFLEVBQUUsS0FBSztVQUNoQixNQUFNLEdBQUcsR0FBRyxFQUFFLENBQUMsT0FBTztZQUNwQiwyQkFBMkI7WUFDM0IsSUFBSTtZQUNMO1VBQ0QsT0FBTyxDQUFDLE1BQU0sRUFBRSxHQUFHLENBQUMsZ0JBQWdCLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQztTQUM3QztRQUNGOztNQUVELE1BQU0sS0FBSyxHQUFHLElBQUksV0FBVyxDQUFDLElBQUksRUFBQzs7O01BR25DLEtBQUs7U0FDRixNQUFNLENBQUMsSUFBSSxDQUFDO1NBQ1osT0FBTyxDQUFDLGtCQUFrQixDQUFDO1NBQzNCLE1BQU0sQ0FBQyxXQUFXLEVBQUM7OztNQUd0QixPQUFPLFNBQVM7VUFDWjtZQUNFLElBQUksRUFBRSxLQUFLLENBQUMsUUFBUSxFQUFFO1lBQ3RCLEdBQUcsRUFBRSxLQUFLLENBQUMsV0FBVyxDQUFDO2NBQ3JCLE1BQU0sRUFBRSxRQUFRO2NBQ2hCLEtBQUssRUFBRSxJQUFJO2FBQ1osQ0FBQztXQUNIO1VBQ0QsRUFBRSxJQUFJLEVBQUUsS0FBSyxDQUFDLFFBQVEsRUFBRSxFQUFFO0tBQy9COzs7Ozs7SUFNRCxNQUFNLGNBQWMsQ0FBQyxPQUFPLEVBQUUsTUFBTSxFQUFFOztNQUVwQyxNQUFNLFdBQVcsR0FBRyxLQUFLLENBQUMsSUFBSTtRQUM1QixNQUFNLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLE1BQU07VUFDMUIsQ0FBQyxHQUFHLEVBQUUsRUFBRSxJQUFJLEVBQUUsY0FBYyxFQUFFLEVBQUUsRUFBRSxLQUFLOztZQUVyQyxJQUFJLEVBQUUsSUFBSSxpQkFBaUIsQ0FBQyxFQUFFLENBQUMsRUFBRTtjQUMvQixPQUFPLElBQUksR0FBRyxDQUFDO2dCQUNiLEdBQUcsaUJBQWlCLENBQUMsSUFBSSxDQUFDO2dCQUMxQixHQUFHLEdBQUc7ZUFDUCxDQUFDO2FBQ0gsTUFBTTtjQUNMLE9BQU8sR0FBRzthQUNYO1dBQ0Y7VUFDRCxJQUFJLEdBQUcsRUFBRTtTQUNWO1FBQ0Y7O01BRUQsSUFBSSxPQUFPLEVBQUU7O1FBRVgsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxXQUFXLEVBQUM7O1FBRTdDLElBQUksQ0FBQyxLQUFLLENBQUMsU0FBUyxFQUFFO1VBQ3BCLE9BQU8sQ0FBQyxHQUFHLENBQUMsc0JBQXNCLEVBQUUsV0FBVyxFQUFDO1NBQ2pELE1BQU0sSUFBSSxTQUFTLEtBQUssS0FBSyxDQUFDLFNBQVMsRUFBRTtVQUN4QyxPQUFPLENBQUMsR0FBRyxDQUFDLDBCQUEwQixFQUFFLFdBQVcsRUFBQztTQUNyRDs7UUFFRCxLQUFLLENBQUMsU0FBUyxHQUFHLFVBQVM7T0FDNUI7Ozs7TUFJRCxNQUFNLGVBQWUsR0FBRyxNQUFNLGtCQUFrQixDQUFDLElBQUk7UUFDbkQsSUFBSTtRQUNKLFlBQVk7UUFDYjs7TUFFRCxJQUFJO1FBQ0YsTUFBTSxZQUFZLEdBQUdDLHVCQUFjO1VBQ2pDLEdBQUc7O1VBRUgsZUFBZSxDQUFDLE1BQU07WUFDcEIsZUFBZTtZQUNmLEtBQUssQ0FBQyxRQUFRO1dBQ2Y7VUFDRCxXQUFXO1VBQ1o7OztRQUdELElBQUksWUFBWSxFQUFFO1VBQ2hCLE9BQU8sQ0FBQyxHQUFHLENBQUMsY0FBYyxFQUFFLFlBQVksRUFBQzs7VUFFekMsSUFBSSxhQUFhLEVBQUU7WUFDakIsTUFBTSxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUMsV0FBVyxLQUFLO2NBQ3BDLGFBQWEsR0FBRyxZQUFXO2FBQzVCLEVBQUM7O1lBRUYsT0FBTyxDQUFDLEdBQUcsQ0FBQyx3QkFBd0IsRUFBQztXQUN0Qzs7Ozs7VUFLRCxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsU0FBUztZQUM3QixvQkFBb0I7WUFDcEIsUUFBUSxDQUFDLGFBQWEsRUFBRTtZQUN6Qjs7VUFFRCxNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsUUFBUSxFQUFDOzs7VUFHbEQsUUFBUSxDQUFDLGNBQWMsQ0FBQyxZQUFZLEVBQUUsVUFBVSxFQUFDO1NBQ2xEOztRQUVELElBQUksU0FBUyxFQUFFO1VBQ2IsWUFBWSxDQUFDLEdBQUcsR0FBRyxVQUFTO1NBQzdCLE1BQU07VUFDTCxPQUFPLFlBQVksQ0FBQyxJQUFHO1NBQ3hCOzs7UUFHRCxNQUFNLENBQUMsWUFBWSxDQUFDLEdBQUc7VUFDckIsUUFBUSxFQUFFLFlBQVk7VUFDdEIsT0FBTyxFQUFFLElBQUk7VUFDYixNQUFNLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxZQUFZLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztVQUM5QztPQUNGLENBQUMsT0FBTyxLQUFLLEVBQUU7UUFDZCxJQUFJLEtBQUssQ0FBQyxJQUFJLEtBQUssaUJBQWlCLEVBQUUsTUFBTSxLQUFLOztRQUVqRCxLQUFLLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLEdBQUcsS0FBSztVQUM1QixPQUFPLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBQztTQUNqQixFQUFDOztRQUVGLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLE9BQU8sRUFBQztPQUMxQjtLQUNGOztJQUVELFdBQVcsR0FBRztNQUNaLElBQUksWUFBWSxFQUFFO1FBQ2hCLE9BQU8sUUFBUSxDQUFDLE1BQU0sRUFBRSxDQUFDLEtBQUssQ0FBQyxDQUFDLEtBQUssS0FBSztVQUN4QyxNQUFNLE9BQU8sR0FBRyxDQUFDLEVBQUUsS0FBSyxDQUFDLE9BQU8sQ0FBQyxFQUFFLEVBQUUsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUM7VUFDbEQsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUM7U0FDbkIsQ0FBQztPQUNIO0tBQ0Y7R0FDRjtDQUNGOztBQ3JVRCxZQUFlLElBQUksSUFBSTtFQUNyQixNQUFNLFFBQVEsR0FBRyxhQUFhLENBQUMsSUFBSSxFQUFDO0VBQ3BDLE1BQU0sSUFBSSxHQUFHLFVBQVUsQ0FBQyxBQUFJLEVBQUM7RUFDN0IsTUFBTSxPQUFPLEdBQUcsQ0FBQyxRQUFRLEVBQUUsSUFBSSxFQUFDOztFQUVoQyxPQUFPO0lBQ0wsSUFBSSxFQUFFLGtCQUFrQjs7SUFFeEIsT0FBTyxDQUFDLE9BQU8sRUFBRTtNQUNmLE9BQU8sT0FBTyxDQUFDLE1BQU07UUFDbkIsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxPQUFPLEdBQUcsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUNuRCxPQUFPO09BQ1I7S0FDRjs7SUFFRCxVQUFVLENBQUMsT0FBTyxFQUFFO01BQ2xCLFFBQVEsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxPQUFPLEVBQUM7TUFDdkMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLE9BQU8sRUFBQztLQUNwQzs7SUFFRCxXQUFXLENBQUMsRUFBRSxFQUFFO01BQ2QsUUFBUSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLEVBQUUsRUFBQztNQUNuQyxJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsRUFBRSxFQUFDO0tBQ2hDOztJQUVELFdBQVcsQ0FBQyxHQUFHLElBQUksRUFBRTtNQUNuQixPQUFPLFFBQVEsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxHQUFHLElBQUksQ0FBQztLQUNoRDs7SUFFRCxNQUFNLGNBQWMsQ0FBQyxHQUFHLElBQUksRUFBRTtNQUM1QixNQUFNLElBQUksR0FBRyxpQkFBZ0I7O01BRTdCLE1BQU0sT0FBTyxDQUFDLEdBQUcsQ0FBQztRQUNoQixRQUFRLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxHQUFHLElBQUksQ0FBQztRQUNsQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxHQUFHLElBQUksQ0FBQztPQUMvQixFQUFDO0tBQ0g7O0lBRUQsV0FBVyxHQUFHO01BQ1osUUFBUSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFDO0tBQ2hDO0dBQ0Y7Q0FDRjs7OzsifQ==
