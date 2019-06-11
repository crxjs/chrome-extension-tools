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
  let firstRun = true;

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
          if (startReloader) {
            await reloader.start((shouldStart) => {
              startReloader = shouldStart;
            });

            console.log('reloader is running...');
          }

          // TODO: reloader should be wrapped
          //       in a dynamic import
          //       to support module features.
          reloader.createClientFiles.call(this);

          // TODO: here, client path should be the wrapper file.
          reloader.updateManifest(manifestBody);
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
      if (_useReloader && !firstRun) {
        return reloader
          .reload()
          .then(() => {
            console.log('reload success...');
          })
          .catch((error) => {
            const message = `${error.message} (${error.code})`;
            this.warn(message);
          })
      } else {
        firstRun = false;
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hyb21lLWV4dGVuc2lvbi1janMuanMiLCJzb3VyY2VzIjpbIi4uL3NyYy9oZWxwZXJzLmpzIiwiLi4vc3JjL2h0bWwtaW5wdXRzL2NoZWVyaW8uanMiLCIuLi9zcmMvaHRtbC1pbnB1dHMvaGVscGVycy5qcyIsIi4uL3NyYy9odG1sLWlucHV0cy9pbmRleC5qcyIsIi4uL3NyYy9tYW5pZmVzdC1pbnB1dC9tYXBPYmplY3RWYWx1ZXMuanMiLCIuLi9zcmMvbWFuaWZlc3QtaW5wdXQvaW5kZXguanMiLCIuLi9zcmMvaW5kZXguanMiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IGZzIGZyb20gJ2ZzLWV4dHJhJ1xuaW1wb3J0IHBhdGggZnJvbSAncGF0aCdcblxuZXhwb3J0IGNvbnN0IG5vdCA9IGZuID0+IHggPT4gIWZuKHgpXG5cbmV4cG9ydCBjb25zdCBsb2FkQXNzZXREYXRhID0gYXNzZXRQYXRoID0+XG4gIGZzLnJlYWRGaWxlKGFzc2V0UGF0aCkudGhlbihzcmMgPT4gW2Fzc2V0UGF0aCwgc3JjXSlcblxuZXhwb3J0IGNvbnN0IHppcEFycmF5cyA9IChhMSwgYTIpID0+IGExLm1hcCgoeCwgaSkgPT4gW3gsIGEyW2ldXSlcblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGdldEFzc2V0UGF0aE1hcEZucyhhc3NldHMpIHtcbiAgcmV0dXJuIChhd2FpdCBhc3NldHMpLm1hcCgoW2Fzc2V0UGF0aCwgYXNzZXRTcmNdKSA9PiB7XG4gICAgY29uc3QgbmFtZSA9IHBhdGguYmFzZW5hbWUoYXNzZXRQYXRoKVxuICAgIGNvbnN0IGlkID0gdGhpcy5lbWl0QXNzZXQobmFtZSwgYXNzZXRTcmMpXG4gICAgY29uc3QgYXNzZXRGaWxlTmFtZSA9IHRoaXMuZ2V0QXNzZXRGaWxlTmFtZShpZClcblxuICAgIHJldHVybiB4ID0+IHtcbiAgICAgIGlmICh0eXBlb2YgeCAhPT0gJ3N0cmluZycpIHJldHVybiB4XG5cbiAgICAgIGlmIChhc3NldFBhdGguZW5kc1dpdGgoeCkpIHtcbiAgICAgICAgcmV0dXJuIGFzc2V0RmlsZU5hbWVcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiB4XG4gICAgICB9XG4gICAgfVxuICB9KVxufVxuXG5leHBvcnQgY29uc3Qgd3JpdGVGaWxlID0gZGVzdCA9PiAoW2h0bWxQYXRoLCBodG1sU3JjXSkgPT4ge1xuICBjb25zdCBiYXNlTmFtZSA9IHBhdGguYmFzZW5hbWUoaHRtbFBhdGgpXG4gIGNvbnN0IGRlc3RQYXRoID0gcGF0aC5qb2luKGRlc3QsIGJhc2VOYW1lKVxuICByZXR1cm4gZnMud3JpdGVGaWxlKGRlc3RQYXRoLCBodG1sU3JjKVxufVxuIiwiaW1wb3J0IHBhdGggZnJvbSAncGF0aCdcbmltcG9ydCBmcyBmcm9tICdmcy1leHRyYSdcbmltcG9ydCBjaGVlcmlvIGZyb20gJ2NoZWVyaW8nXG5cbmV4cG9ydCBjb25zdCBsb2FkSHRtbCA9IChmaWxlUGF0aCkgPT4ge1xuICBjb25zdCBodG1sQ29kZSA9IGZzLnJlYWRGaWxlU3luYyhmaWxlUGF0aCwgJ3V0ZjgnKVxuICBjb25zdCAkID0gY2hlZXJpby5sb2FkKGh0bWxDb2RlKVxuXG4gIHJldHVybiAkXG59XG5cbmNvbnN0IGdldFJlbGF0aXZlUGF0aCA9IChodG1sUGF0aCkgPT4gKHApID0+XG4gIHBhdGguam9pbihwYXRoLmRpcm5hbWUoaHRtbFBhdGgpLCBwKVxuXG5jb25zdCBnZXRFbnRyaWVzID0gKCQpID0+XG4gICQoJ3NjcmlwdCcpXG4gICAgLm5vdCgnW2RhdGEtcm9sbHVwLWFzc2V0XScpXG4gICAgLm5vdCgnW3NyY149XCJodHRwOlwiXScpXG4gICAgLm5vdCgnW3NyY149XCJodHRwczpcIl0nKVxuICAgIC5ub3QoJ1tzcmNePVwiZGF0YTpcIl0nKVxuICAgIC5ub3QoJ1tzcmNePVwiL1wiXScpXG4gICAgLnRvQXJyYXkoKVxuXG5leHBvcnQgY29uc3QgZ2V0SnNFbnRyaWVzID0gKFtodG1sUGF0aCwgJF0pID0+XG4gIGdldEVudHJpZXMoJClcbiAgICAubWFwKChlbGVtKSA9PiAkKGVsZW0pLmF0dHIoJ3NyYycpKVxuICAgIC5tYXAoZ2V0UmVsYXRpdmVQYXRoKGh0bWxQYXRoKSlcblxuZXhwb3J0IGNvbnN0IG11dGF0ZUpzRW50cmllcyA9ICgkKSA9PiB7XG4gIGdldEVudHJpZXMoJClcbiAgICAubWFwKChlbGVtKSA9PiAkKGVsZW0pKVxuICAgIC5mb3JFYWNoKChlKSA9PiB7XG4gICAgICBlLmF0dHIoJ3R5cGUnLCAnbW9kdWxlJylcbiAgICB9KVxuXG4gIHJldHVybiAkXG59XG5cbi8qIC0tLS0tLS0tLS0tLS0tLS0tIGpzIGFzc2V0cyAtLS0tLS0tLS0tLS0tLS0tICovXG5cbmNvbnN0IGdldEFzc2V0cyA9ICgkKSA9PlxuICAkKCdzY3JpcHQnKVxuICAgIC5maWx0ZXIoJ1tkYXRhLXJvbGx1cC1hc3NldD1cInRydWVcIl0nKVxuICAgIC5ub3QoJ1tzcmNePVwiaHR0cDpcIl0nKVxuICAgIC5ub3QoJ1tzcmNePVwiaHR0cHM6XCJdJylcbiAgICAubm90KCdbc3JjXj1cImRhdGE6XCJdJylcbiAgICAubm90KCdbc3JjXj1cIi9cIl0nKVxuICAgIC50b0FycmF5KClcblxuZXhwb3J0IGNvbnN0IGdldEpzQXNzZXRzID0gKFtodG1sUGF0aCwgJF0pID0+XG4gIGdldEFzc2V0cygkKVxuICAgIC5tYXAoKGVsZW0pID0+ICQoZWxlbSkuYXR0cignc3JjJykpXG4gICAgLm1hcChnZXRSZWxhdGl2ZVBhdGgoaHRtbFBhdGgpKVxuXG5leHBvcnQgY29uc3QgbXV0YXRlSnNBc3NldHMgPSAoJCwgZm4pID0+IHtcbiAgZ2V0QXNzZXRzKCQpXG4gICAgLm1hcCgoZWxlbSkgPT4gJChlbGVtKSlcbiAgICAuZm9yRWFjaCgoZSkgPT4ge1xuICAgICAgY29uc3QgdmFsdWUgPSBmbihlLmF0dHIoJ3NyYycpKVxuICAgICAgZS5hdHRyKCdzcmMnLCB2YWx1ZSlcbiAgICB9KVxuXG4gIHJldHVybiAkXG59XG5cbi8qIC0tLS0tLS0tLS0tLS0tLS0tLS0tIGNzcyAtLS0tLS0tLS0tLS0tLS0tLS0tICovXG5cbmNvbnN0IGdldENzcyA9ICgkKSA9PlxuICAkKCdsaW5rJylcbiAgICAuZmlsdGVyKCdbcmVsPVwic3R5bGVzaGVldFwiXScpXG4gICAgLm5vdCgnW2hyZWZePVwiaHR0cDpcIl0nKVxuICAgIC5ub3QoJ1tocmVmXj1cImh0dHBzOlwiXScpXG4gICAgLm5vdCgnW2hyZWZePVwiZGF0YTpcIl0nKVxuICAgIC5ub3QoJ1tocmVmXj1cIi9cIl0nKVxuICAgIC50b0FycmF5KClcblxuZXhwb3J0IGNvbnN0IGdldENzc0hyZWZzID0gKFtodG1sUGF0aCwgJF0pID0+XG4gIGdldENzcygkKVxuICAgIC5tYXAoKGVsZW0pID0+ICQoZWxlbSkuYXR0cignaHJlZicpKVxuICAgIC5tYXAoZ2V0UmVsYXRpdmVQYXRoKGh0bWxQYXRoKSlcblxuZXhwb3J0IGNvbnN0IG11dGF0ZUNzc0hyZWZzID0gKCQsIGZuKSA9PiB7XG4gIGdldENzcygkKVxuICAgIC5tYXAoKGVsZW0pID0+ICQoZWxlbSkpXG4gICAgLmZvckVhY2goKGUpID0+IHtcbiAgICAgIGNvbnN0IHZhbHVlID0gZm4oZS5hdHRyKCdocmVmJykpXG4gICAgICBlLmF0dHIoJ2hyZWYnLCB2YWx1ZSlcbiAgICB9KVxuXG4gIHJldHVybiAkXG59XG5cbi8qIC0tLS0tLS0tLS0tLS0tLS0tLS0tIGltZyAtLS0tLS0tLS0tLS0tLS0tLS0tICovXG5jb25zdCBnZXRJbWdzID0gKCQpID0+XG4gICQoJ2ltZycpXG4gICAgLm5vdCgnW3NyY149XCJodHRwOi8vXCJdJylcbiAgICAubm90KCdbc3JjXj1cImh0dHBzOi8vXCJdJylcbiAgICAubm90KCdbc3JjXj1cImRhdGE6XCJdJylcbiAgICAubm90KCdbc3JjXj1cIi9cIl0nKVxuICAgIC50b0FycmF5KClcblxuY29uc3QgZ2V0RmF2aWNvbnMgPSAoJCkgPT5cbiAgJCgnbGlua1tyZWw9XCJpY29uXCJdJylcbiAgICAubm90KCdbaHJlZl49XCJodHRwOlwiXScpXG4gICAgLm5vdCgnW2hyZWZePVwiaHR0cHM6XCJdJylcbiAgICAubm90KCdbaHJlZl49XCJkYXRhOlwiXScpXG4gICAgLm5vdCgnW2hyZWZePVwiL1wiXScpXG4gICAgLnRvQXJyYXkoKVxuXG5leHBvcnQgY29uc3QgZ2V0SW1nU3JjcyA9IChbaHRtbFBhdGgsICRdKSA9PiB7XG4gIHJldHVybiBbXG4gICAgLi4uZ2V0SW1ncygkKS5tYXAoKGVsZW0pID0+ICQoZWxlbSkuYXR0cignc3JjJykpLFxuICAgIC8vIGdldCBmYXZpY29uc1xuICAgIC4uLmdldEZhdmljb25zKCQpLm1hcCgoZWxlbSkgPT4gJChlbGVtKS5hdHRyKCdocmVmJykpLFxuICBdLm1hcChnZXRSZWxhdGl2ZVBhdGgoaHRtbFBhdGgpKVxufVxuXG5leHBvcnQgY29uc3QgbXV0YXRlSW1nU3JjcyA9ICgkLCBmbikgPT4ge1xuICBnZXRJbWdzKCQpXG4gICAgLm1hcCgoZWxlbSkgPT4gJChlbGVtKSlcbiAgICAuZm9yRWFjaCgoZSkgPT4ge1xuICAgICAgY29uc3QgdmFsdWUgPSBmbihlLmF0dHIoJ3NyYycpKVxuICAgICAgZS5hdHRyKCdzcmMnLCB2YWx1ZSlcbiAgICB9KVxuXG4gIGdldEZhdmljb25zKCQpXG4gICAgLm1hcCgoZWxlbSkgPT4gJChlbGVtKSlcbiAgICAuZm9yRWFjaCgoZSkgPT4ge1xuICAgICAgY29uc3QgdmFsdWUgPSBmbihlLmF0dHIoJ2hyZWYnKSlcbiAgICAgIGUuYXR0cignaHJlZicsIHZhbHVlKVxuICAgIH0pXG5cbiAgcmV0dXJuICRcbn1cbiIsImltcG9ydCB7IGxvYWRBc3NldERhdGEgfSBmcm9tICcuLi9oZWxwZXJzJ1xuaW1wb3J0IHsgZ2V0Q3NzSHJlZnMsIGdldEltZ1NyY3MsIGdldEpzQXNzZXRzIH0gZnJvbSAnLi9jaGVlcmlvJ1xuXG4vKiAtLS0tLS0tLS0tLS0tIGhlbHBlciBmdW5jdGlvbnMgLS0tLS0tLS0tLS0tLSAqL1xuXG5leHBvcnQgY29uc3Qgbm90ID0gZm4gPT4geCA9PiAhZm4oeClcblxuZXhwb3J0IGNvbnN0IGlzSHRtbCA9IHBhdGggPT4gL1xcLmh0bWw/JC8udGVzdChwYXRoKVxuXG5leHBvcnQgY29uc3QgbG9hZEh0bWxBc3NldHMgPSBodG1sRGF0YSA9PlxuICBQcm9taXNlLmFsbChcbiAgICBodG1sRGF0YS5tYXAoYXN5bmMgZGF0YSA9PlxuICAgICAgZGF0YS5jb25jYXQoe1xuICAgICAgICBqczogYXdhaXQgUHJvbWlzZS5hbGwoXG4gICAgICAgICAgZ2V0SnNBc3NldHMoZGF0YSkubWFwKGxvYWRBc3NldERhdGEpLFxuICAgICAgICApLFxuICAgICAgICBpbWc6IGF3YWl0IFByb21pc2UuYWxsKFxuICAgICAgICAgIGdldEltZ1NyY3MoZGF0YSkubWFwKGxvYWRBc3NldERhdGEpLFxuICAgICAgICApLFxuICAgICAgICBjc3M6IGF3YWl0IFByb21pc2UuYWxsKFxuICAgICAgICAgIGdldENzc0hyZWZzKGRhdGEpLm1hcChsb2FkQXNzZXREYXRhKSxcbiAgICAgICAgKSxcbiAgICAgIH0pLFxuICAgICksXG4gIClcbiIsImltcG9ydCBwYXRoIGZyb20gJ3BhdGgnXG5pbXBvcnQgeyBnZXRBc3NldFBhdGhNYXBGbnMsIHppcEFycmF5cyB9IGZyb20gJy4uL2hlbHBlcnMnXG5pbXBvcnQge1xuICBnZXRKc0VudHJpZXMsXG4gIGxvYWRIdG1sLFxuICBtdXRhdGVDc3NIcmVmcyxcbiAgbXV0YXRlSW1nU3JjcyxcbiAgbXV0YXRlSnNBc3NldHMsXG4gIG11dGF0ZUpzRW50cmllcyxcbn0gZnJvbSAnLi9jaGVlcmlvJ1xuaW1wb3J0IHsgaXNIdG1sLCBsb2FkSHRtbEFzc2V0cywgbm90IH0gZnJvbSAnLi9oZWxwZXJzJ1xuXG5jb25zdCBuYW1lID0gJ2h0bWwtaW5wdXRzJ1xuXG4vKiA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PSAqL1xuLyogICAgICAgICAgICAgICAgICBIVE1MLUlOUFVUUyAgICAgICAgICAgICAgICAgKi9cbi8qID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09ICovXG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIGh0bWxJbnB1dHMoKSB7XG4gIC8qIC0tLS0tLS0tLS0tLS0tIGhvb2tzIGNsb3N1cmVzIC0tLS0tLS0tLS0tLS0tICovXG5cbiAgY29uc3QgY2FjaGUgPSB7fVxuXG4gIC8vIEFzc2V0cyB3aWxsIGJlIGEgUHJvbWlzZVxuICBsZXQgaHRtbEFzc2V0c1xuICBsZXQganNFbnRyaWVzXG5cbiAgLyogLS0tLS0tLS0tLS0tLS0tIHBsdWdpbiBvYmplY3QgLS0tLS0tLS0tLS0tLS0gKi9cbiAgcmV0dXJuIHtcbiAgICBuYW1lLFxuXG4gICAgLyogPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0gKi9cbiAgICAvKiAgICAgICAgICAgICAgICAgT1BUSU9OUyBIT09LICAgICAgICAgICAgICAgICAqL1xuICAgIC8qID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09ICovXG5cbiAgICBvcHRpb25zKG9wdGlvbnMpIHtcbiAgICAgIC8vIFNraXAgaWYgY2FjaGUuaW5wdXQgZXhpc3RzXG4gICAgICBpZiAoY2FjaGUuaW5wdXQpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAuLi5vcHRpb25zLFxuICAgICAgICAgIGlucHV0OiBjYWNoZS5pbnB1dCxcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICAvLyBDYXN0IG9wdGlvbnMuaW5wdXQgdG8gYXJyYXlcbiAgICAgIGlmICh0eXBlb2Ygb3B0aW9ucy5pbnB1dCA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgb3B0aW9ucy5pbnB1dCA9IFtvcHRpb25zLmlucHV0XVxuICAgICAgfVxuXG4gICAgICAvLyBGaWx0ZXIgaHRtIGFuZCBodG1sIGZpbGVzXG4gICAgICBjYWNoZS5odG1sUGF0aHMgPSBvcHRpb25zLmlucHV0LmZpbHRlcihpc0h0bWwpXG5cbiAgICAgIC8vIFNraXAgaWYgbm8gaHRtbCBmaWxlc1xuICAgICAgaWYgKCFjYWNoZS5odG1sUGF0aHMubGVuZ3RoKSB7XG4gICAgICAgIGh0bWxBc3NldHMgPSBQcm9taXNlLnJlc29sdmUoW10pXG4gICAgICAgIHJldHVybiBvcHRpb25zXG4gICAgICB9XG5cbiAgICAgIC8qIC0tLS0tLS0tLS0tLS0tIExvYWQgaHRtbCBmaWxlcyAtLS0tLS0tLS0tLS0tICovXG5cbiAgICAgIGNvbnN0IGh0bWwkID0gY2FjaGUuaHRtbFBhdGhzLm1hcChsb2FkSHRtbClcblxuICAgICAgY29uc3QgaHRtbERhdGEgPSB6aXBBcnJheXMoY2FjaGUuaHRtbFBhdGhzLCBodG1sJClcblxuICAgICAgLy8gU3RhcnQgYXN5bmMgbG9hZCBmb3IgaHRtbCBhc3NldHNcbiAgICAgIC8vIE5FWFQ6IHJlbG9hZCBodG1sIGFzc2V0cyBvbiBjaGFuZ2VcbiAgICAgIGh0bWxBc3NldHMgPSBsb2FkSHRtbEFzc2V0cyhodG1sRGF0YSlcblxuICAgICAgLy8gR2V0IEpTIGVudHJ5IGZpbGUgbmFtZXNcbiAgICAgIGpzRW50cmllcyA9IGh0bWxEYXRhLmZsYXRNYXAoZ2V0SnNFbnRyaWVzKVxuXG4gICAgICAvLyBDYWNoZSBqc0VudHJpZXMgd2l0aCBleGlzdGluZyBvcHRpb25zLmlucHV0XG4gICAgICBjYWNoZS5pbnB1dCA9IG9wdGlvbnMuaW5wdXRcbiAgICAgICAgLmZpbHRlcihub3QoaXNIdG1sKSlcbiAgICAgICAgLmNvbmNhdChqc0VudHJpZXMpXG5cbiAgICAgIHJldHVybiB7XG4gICAgICAgIC4uLm9wdGlvbnMsXG4gICAgICAgIGlucHV0OiBjYWNoZS5pbnB1dCxcbiAgICAgIH1cbiAgICB9LFxuXG4gICAgLyogPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0gKi9cbiAgICAvKiAgICAgICAgICAgICAgSEFORExFIEZJTEUgQ0hBTkdFUyAgICAgICAgICAgICAqL1xuICAgIC8qID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09ICovXG5cbiAgICBidWlsZFN0YXJ0KCkge1xuICAgICAgY2FjaGUuaHRtbFBhdGhzLmZvckVhY2goKGh0bWxQYXRoKSA9PiB7XG4gICAgICAgIHRoaXMuYWRkV2F0Y2hGaWxlKGh0bWxQYXRoKVxuICAgICAgfSlcbiAgICB9LFxuXG4gICAgd2F0Y2hDaGFuZ2UoaWQpIHtcbiAgICAgIGlmIChpZC5lbmRzV2l0aCgnLmh0bWwnKSkge1xuICAgICAgICBjYWNoZS5pbnB1dCA9IG51bGxcbiAgICAgIH1cbiAgICB9LFxuXG4gICAgLyogPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0gKi9cbiAgICAvKiAgICAgICAgICAgICAgICBHRU5FUkFURUJVTkRMRSAgICAgICAgICAgICAgICAqL1xuICAgIC8qID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09ICovXG5cbiAgICBhc3luYyBnZW5lcmF0ZUJ1bmRsZShvcHRpb25zLCBidW5kbGUpIHtcbiAgICAgIC8vIENPTkNFUk46IHJlbGF0aXZlIHBhdGhzIHdpdGhpbiBDU1MgZmlsZXMgd2lsbCBmYWlsXG4gICAgICAvLyBTT0xVVElPTjogdXNlIHBvc3Rjc3MgdG8gcHJvY2VzcyBDU1MgYXNzZXQgc3JjXG4gICAgICBhd2FpdCBQcm9taXNlLmFsbChcbiAgICAgICAgKGF3YWl0IGh0bWxBc3NldHMpLm1hcChcbiAgICAgICAgICBhc3luYyAoW2h0bWxQYXRoLCAkLCB7IGpzLCBpbWcsIGNzcyB9XSkgPT4ge1xuICAgICAgICAgICAgY29uc3QgaHRtbE5hbWUgPSBwYXRoLmJhc2VuYW1lKGh0bWxQYXRoKVxuXG4gICAgICAgICAgICAvLyBTZXR1cCBmaWxlIHBhdGggbWFwcGluZyBmbnNcbiAgICAgICAgICAgIGNvbnN0IGpzRm5zID0gYXdhaXQgZ2V0QXNzZXRQYXRoTWFwRm5zLmNhbGwodGhpcywganMpXG4gICAgICAgICAgICBjb25zdCBpbWdGbnMgPSBhd2FpdCBnZXRBc3NldFBhdGhNYXBGbnMuY2FsbChcbiAgICAgICAgICAgICAgdGhpcyxcbiAgICAgICAgICAgICAgaW1nLFxuICAgICAgICAgICAgKVxuICAgICAgICAgICAgY29uc3QgY3NzRm5zID0gYXdhaXQgZ2V0QXNzZXRQYXRoTWFwRm5zLmNhbGwoXG4gICAgICAgICAgICAgIHRoaXMsXG4gICAgICAgICAgICAgIGNzcyxcbiAgICAgICAgICAgIClcblxuICAgICAgICAgICAgLy8gVXBkYXRlIGh0bWwgZmlsZSB3aXRoIG5ld1xuICAgICAgICAgICAgLy8gc2NyaXB0IGFuZCBhc3NldCBmaWxlIHBhdGhzXG4gICAgICAgICAgICBtdXRhdGVKc0VudHJpZXMoJClcbiAgICAgICAgICAgIGpzRm5zLnJlZHVjZShtdXRhdGVKc0Fzc2V0cywgJClcbiAgICAgICAgICAgIGNzc0Zucy5yZWR1Y2UobXV0YXRlQ3NzSHJlZnMsICQpXG4gICAgICAgICAgICBpbWdGbnMucmVkdWNlKG11dGF0ZUltZ1NyY3MsICQpXG5cbiAgICAgICAgICAgIC8vIEFkZCBjdXN0b20gYXNzZXQgdG8gYnVuZGxlXG4gICAgICAgICAgICBidW5kbGVbaHRtbE5hbWVdID0ge1xuICAgICAgICAgICAgICBmaWxlTmFtZTogaHRtbE5hbWUsXG4gICAgICAgICAgICAgIGlzQXNzZXQ6IHRydWUsXG4gICAgICAgICAgICAgIHNvdXJjZTogJC5odG1sKCksXG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSxcbiAgICAgICAgKSxcbiAgICAgIClcbiAgICB9LFxuICB9XG59XG4iLCJleHBvcnQgY29uc3QgbWFwT2JqZWN0VmFsdWVzID0gKG9iaiwgZm4pID0+XG4gIE9iamVjdC5lbnRyaWVzKG9iaikucmVkdWNlKChyLCBba2V5LCB2YWx1ZV0pID0+IHtcbiAgICBpZiAodHlwZW9mIHZhbHVlICE9PSAnb2JqZWN0Jykge1xuICAgICAgLy8gaXMgcHJpbWl0aXZlXG4gICAgICByZXR1cm4geyAuLi5yLCBba2V5XTogZm4odmFsdWUpIH1cbiAgICB9IGVsc2UgaWYgKEFycmF5LmlzQXJyYXkodmFsdWUpKSB7XG4gICAgICAvLyBpcyBhcnJheVxuICAgICAgcmV0dXJuIHsgLi4uciwgW2tleV06IHZhbHVlLm1hcChmbikgfVxuICAgIH0gZWxzZSB7XG4gICAgICAvLyBpcyBwbGFpbiBvYmplY3RcbiAgICAgIHJldHVybiB7IC4uLnIsIFtrZXldOiBtYXBPYmplY3RWYWx1ZXModmFsdWUsIGZuKSB9XG4gICAgfVxuICB9LCB7fSlcbiIsImltcG9ydCB7XG4gIGRlcml2ZUVudHJpZXMsXG4gIGRlcml2ZU1hbmlmZXN0LFxuICBkZXJpdmVQZXJtaXNzaW9ucyBhcyBkcCxcbn0gZnJvbSAnQGJ1bWJsZS9tYW5pZmVzdCdcbmltcG9ydCBmcyBmcm9tICdmcy1leHRyYSdcbmltcG9ydCBpc1ZhbGlkUGF0aCBmcm9tICdpcy12YWxpZC1wYXRoJ1xuaW1wb3J0IE1hZ2ljU3RyaW5nIGZyb20gJ21hZ2ljLXN0cmluZydcbmltcG9ydCBtZW1vaXplIGZyb20gJ21lbSdcbmltcG9ydCBwYXRoIGZyb20gJ3BhdGgnXG5pbXBvcnQgcG0gZnJvbSAncGljb21hdGNoJ1xuaW1wb3J0IHsgY3JlYXRlRmlsdGVyIH0gZnJvbSAncm9sbHVwLXBsdWdpbnV0aWxzJ1xuaW1wb3J0IHsgZ2V0QXNzZXRQYXRoTWFwRm5zLCBsb2FkQXNzZXREYXRhIH0gZnJvbSAnLi4vaGVscGVycydcbmltcG9ydCB7IG1hcE9iamVjdFZhbHVlcyB9IGZyb20gJy4vbWFwT2JqZWN0VmFsdWVzJ1xuXG5jb25zdCBuYW1lID0gJ21hbmlmZXN0LWlucHV0J1xuXG4vKiAtLS0tIHByZWRpY2F0ZSBvYmplY3QgZm9yIGRlcml2ZUVudHJpZXMgLS0tLSAqL1xuLy8gY29uc3QgcHJlZE9iaiA9IHtcbi8vICAganM6IHMgPT4gL1xcLmpzJC8udGVzdChzKSxcbi8vICAgY3NzOiBzID0+IC9cXC5jc3MkLy50ZXN0KHMpLFxuLy8gICBodG1sOiBzID0+IC9cXC5odG1sJC8udGVzdChzKSxcbi8vICAgaW1nOiBzID0+IC9cXC5wbmckLy50ZXN0KHMpLFxuLy8gICBmaWx0ZXI6IHYgPT5cbi8vICAgICB0eXBlb2YgdiA9PT0gJ3N0cmluZycgJiZcbi8vICAgICB2LmluY2x1ZGVzKCcuJykgJiZcbi8vICAgICAhdi5pbmNsdWRlcygnKicpICYmXG4vLyAgICAgIS9eaHR0cHM/Oi8udGVzdCh2KSxcbi8vIH1cblxuY29uc3QgbnBtUGtnRGV0YWlscyA9IHtcbiAgbmFtZTogcHJvY2Vzcy5lbnYubnBtX3BhY2thZ2VfbmFtZSxcbiAgdmVyc2lvbjogcHJvY2Vzcy5lbnYubnBtX3BhY2thZ2VfdmVyc2lvbixcbiAgZGVzY3JpcHRpb246IHByb2Nlc3MuZW52Lm5wbV9wYWNrYWdlX2Rlc2NyaXB0aW9uLFxufVxuXG4vKiA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PSAqL1xuLyogICAgICAgICAgICAgICAgTUFOSUZFU1QtSU5QVVQgICAgICAgICAgICAgICAgKi9cbi8qID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09ICovXG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKHtcbiAgcGtnLFxuICB2ZXJib3NlLFxuICBwZXJtaXNzaW9ucyA9IHt9LFxuICBhc3NldHMgPSB7XG4gICAgaW5jbHVkZTogWycqKi8qLnBuZycsICcqKi8qLmNzcyddLFxuICB9LFxuICBlbnRyaWVzID0ge1xuICAgIGluY2x1ZGU6IFsnKiovKiddLFxuICB9LFxuICBpaWFmZSA9IHtcbiAgICAvLyBpbmNsdWRlIGlzIGRlZmF1bHRlZCB0byBbXSwgc28gZXhjbHVkZSBjYW4gYmUgdXNlZCBieSBpdHNlbGZcbiAgfSxcbiAgcHVibGljS2V5LFxuICB1c2VSZWxvYWRlciA9IHByb2Nlc3MuZW52LlJPTExVUF9XQVRDSCxcbiAgcmVsb2FkZXIsXG59ID0ge30pIHtcbiAgaWYgKCFwa2cpIHtcbiAgICBwa2cgPSBucG1Qa2dEZXRhaWxzXG4gIH1cblxuICBsZXQgX3VzZVJlbG9hZGVyID0gdXNlUmVsb2FkZXIgJiYgcmVsb2FkZXJcbiAgbGV0IHN0YXJ0UmVsb2FkZXIgPSB0cnVlXG4gIGxldCBmaXJzdFJ1biA9IHRydWVcblxuICAvKiAtLS0tLS0tLS0tLS0tLSBob29rcyBjbG9zdXJlcyAtLS0tLS0tLS0tLS0tLSAqL1xuICBpaWFmZS5pbmNsdWRlID0gaWlhZmUuaW5jbHVkZSB8fCBbXVxuICBsZXQgaWlhZmVGaWx0ZXJcblxuICBsZXQgbG9hZGVkQXNzZXRzXG4gIGxldCBzcmNEaXJcblxuICBsZXQgbWFuaWZlc3RQYXRoXG5cbiAgY29uc3QgY2FjaGUgPSB7fVxuXG4gIGNvbnN0IG1hbmlmZXN0TmFtZSA9ICdtYW5pZmVzdC5qc29uJ1xuXG4gIGNvbnN0IHBlcm1pc3Npb25zRmlsdGVyID0gcG0oXG4gICAgcGVybWlzc2lvbnMuaW5jbHVkZSB8fCAnKiovKicsXG4gICAgcGVybWlzc2lvbnMuZXhjbHVkZSxcbiAgKVxuXG4gIGNvbnN0IGFzc2V0RmlsdGVyID0gcG0oYXNzZXRzLmluY2x1ZGUsIHtcbiAgICBpZ25vcmU6IGFzc2V0cy5leGNsdWRlLFxuICB9KVxuXG4gIGNvbnN0IGVudHJ5RmlsdGVyID0gcG0oZW50cmllcy5pbmNsdWRlLCB7XG4gICAgaWdub3JlOiBlbnRyaWVzLmV4Y2x1ZGUsXG4gIH0pXG5cbiAgY29uc3QgZGVyaXZlUGVybWlzc2lvbnMgPSBtZW1vaXplKGRwKVxuXG4gIC8qIC0tLS0tLS0tLS0tLS0tLSBwbHVnaW4gb2JqZWN0IC0tLS0tLS0tLS0tLS0tICovXG4gIHJldHVybiB7XG4gICAgbmFtZSxcblxuICAgIC8qID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09ICovXG4gICAgLyogICAgICAgICAgICAgICAgIE9QVElPTlMgSE9PSyAgICAgICAgICAgICAgICAgKi9cbiAgICAvKiA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PSAqL1xuXG4gICAgb3B0aW9ucyhvcHRpb25zKSB7XG4gICAgICAvLyBEbyBub3QgcmVsb2FkIG1hbmlmZXN0IHdpdGhvdXQgY2hhbmdlc1xuICAgICAgaWYgKGNhY2hlLm1hbmlmZXN0KSB7XG4gICAgICAgIHJldHVybiB7IC4uLm9wdGlvbnMsIGlucHV0OiBjYWNoZS5pbnB1dCB9XG4gICAgICB9XG5cbiAgICAgIG1hbmlmZXN0UGF0aCA9IG9wdGlvbnMuaW5wdXRcbiAgICAgIHNyY0RpciA9IHBhdGguZGlybmFtZShtYW5pZmVzdFBhdGgpXG5cbiAgICAgIC8vIENoZWNrIHRoYXQgaW5wdXQgaXMgbWFuaWZlc3QuanNvblxuICAgICAgaWYgKCFtYW5pZmVzdFBhdGguZW5kc1dpdGgobWFuaWZlc3ROYW1lKSkge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFxuICAgICAgICAgIGAke25hbWV9OiBpbnB1dCBpcyBub3QgbWFuaWZlc3QuanNvbmAsXG4gICAgICAgIClcbiAgICAgIH1cblxuICAgICAgLy8gTG9hZCBtYW5pZmVzdC5qc29uXG4gICAgICBjYWNoZS5tYW5pZmVzdCA9IGZzLnJlYWRKU09OU3luYyhtYW5pZmVzdFBhdGgpXG5cbiAgICAgIC8vIERlcml2ZSBlbnRyeSBwYXRocyBmcm9tIG1hbmlmZXN0XG4gICAgICBjb25zdCB7IGFzc2V0UGF0aHMsIGVudHJ5UGF0aHMgfSA9IGRlcml2ZUVudHJpZXMoXG4gICAgICAgIGNhY2hlLm1hbmlmZXN0LFxuICAgICAgICB7XG4gICAgICAgICAgYXNzZXRQYXRoczogYXNzZXRGaWx0ZXIsXG4gICAgICAgICAgZW50cnlQYXRoczogZW50cnlGaWx0ZXIsXG4gICAgICAgICAgdHJhbnNmb3JtOiAobmFtZSkgPT4gcGF0aC5qb2luKHNyY0RpciwgbmFtZSksXG4gICAgICAgICAgZmlsdGVyOiAodikgPT5cbiAgICAgICAgICAgIHR5cGVvZiB2ID09PSAnc3RyaW5nJyAmJlxuICAgICAgICAgICAgaXNWYWxpZFBhdGgodikgJiZcbiAgICAgICAgICAgICEvXmh0dHBzPzovLnRlc3QodiksXG4gICAgICAgIH0sXG4gICAgICApXG5cbiAgICAgIC8vIFN0YXJ0IGFzeW5jIGFzc2V0IGxvYWRpbmdcbiAgICAgIC8vIENPTkNFUk46IHJlbGF0aXZlIHBhdGhzIHdpdGhpbiBDU1MgZmlsZXMgd2lsbCBmYWlsXG4gICAgICAvLyBTT0xVVElPTjogdXNlIHBvc3Rjc3MgdG8gcHJvY2VzcyBDU1MgYXNzZXQgc3JjXG4gICAgICBsb2FkZWRBc3NldHMgPSBQcm9taXNlLmFsbChhc3NldFBhdGhzLm1hcChsb2FkQXNzZXREYXRhKSlcblxuICAgICAgLy8gUmVuZGVyIG9ubHkgbWFuaWZlc3QgZW50cnkganMgZmlsZXNcbiAgICAgIC8vIGFzIGFzeW5jIGlpZmVcbiAgICAgIGNvbnN0IGpzID0gZW50cnlQYXRocy5maWx0ZXIoKHApID0+IC9cXC5qcyQvLnRlc3QocCkpXG4gICAgICBpaWFmZUZpbHRlciA9IGNyZWF0ZUZpbHRlcihcbiAgICAgICAgaWlhZmUuaW5jbHVkZS5jb25jYXQoanMpLFxuICAgICAgICBpaWFmZS5leGNsdWRlLFxuICAgICAgKVxuXG4gICAgICAvLyBDYWNoZSBkZXJpdmVkIGlucHV0c1xuICAgICAgY2FjaGUuaW5wdXQgPSBlbnRyeVBhdGhzXG5cbiAgICAgIHJldHVybiB7IC4uLm9wdGlvbnMsIGlucHV0OiBjYWNoZS5pbnB1dCB9XG4gICAgfSxcblxuICAgIC8qID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09ICovXG4gICAgLyogICAgICAgICAgICAgIEhBTkRMRSBXQVRDSCBGSUxFUyAgICAgICAgICAgICAgKi9cbiAgICAvKiA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PSAqL1xuXG4gICAgYXN5bmMgYnVpbGRTdGFydCgpIHtcbiAgICAgIHRoaXMuYWRkV2F0Y2hGaWxlKG1hbmlmZXN0UGF0aClcbiAgICB9LFxuXG4gICAgd2F0Y2hDaGFuZ2UoaWQpIHtcbiAgICAgIGlmIChpZC5lbmRzV2l0aChtYW5pZmVzdE5hbWUpKSB7XG4gICAgICAgIC8vIER1bXAgY2FjaGUubWFuaWZlc3QgaWYgbWFuaWZlc3QuanNvbiBjaGFuZ2VzXG4gICAgICAgIGNhY2hlLm1hbmlmZXN0ID0gbnVsbFxuICAgICAgfVxuICAgIH0sXG5cbiAgICAvKiA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PSAqL1xuICAgIC8qICAgICAgICAgICAgICAgICAgIFRSQU5TRk9STSAgICAgICAgICAgICAgICAgICovXG4gICAgLyogPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0gKi9cblxuICAgIC8vIHRyYW5zZm9ybShjb2RlLCBpZCkge30sXG5cbiAgICAvKiA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PSAqL1xuICAgIC8qICAgICAgIE1BS0UgTUFOSUZFU1QgRU5UUklFUyBBU1lOQyBJSUZFICAgICAgICovXG4gICAgLyogPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0gKi9cblxuICAgIHJlbmRlckNodW5rKFxuICAgICAgc291cmNlLFxuICAgICAgeyBpc0VudHJ5LCBmYWNhZGVNb2R1bGVJZDogaWQsIGZpbGVOYW1lIH0sXG4gICAgICB7IHNvdXJjZW1hcCB9LFxuICAgICkge1xuICAgICAgaWYgKCFpc0VudHJ5IHx8ICFpaWFmZUZpbHRlcihpZCkpIHJldHVybiBudWxsXG5cbiAgICAgIC8vIHR1cm4gZXMgaW1wb3J0cyB0byBkeW5hbWljIGltcG9ydHNcbiAgICAgIGNvbnN0IGNvZGUgPSBzb3VyY2UucmVwbGFjZShcbiAgICAgICAgL15pbXBvcnQgKC4rKSBmcm9tICgnLis/Jyk7JC9nbSxcbiAgICAgICAgKGxpbmUsICQxLCAkMikgPT4ge1xuICAgICAgICAgIGNvbnN0IGFzZyA9ICQxLnJlcGxhY2UoXG4gICAgICAgICAgICAvKD88PVxcey4rKSggYXMgKSg/PS4rP1xcfSkvZyxcbiAgICAgICAgICAgICc6ICcsXG4gICAgICAgICAgKVxuICAgICAgICAgIHJldHVybiBgY29uc3QgJHthc2d9ID0gYXdhaXQgaW1wb3J0KCR7JDJ9KTtgXG4gICAgICAgIH0sXG4gICAgICApXG5cbiAgICAgIGNvbnN0IG1hZ2ljID0gbmV3IE1hZ2ljU3RyaW5nKGNvZGUpXG5cbiAgICAgIC8vIEFzeW5jIElJRkUtZnlcbiAgICAgIG1hZ2ljXG4gICAgICAgIC5pbmRlbnQoJyAgJylcbiAgICAgICAgLnByZXBlbmQoJyhhc3luYyAoKSA9PiB7XFxuJylcbiAgICAgICAgLmFwcGVuZCgnXFxufSkoKTtcXG4nKVxuXG4gICAgICAvLyBHZW5lcmF0ZSBzb3VyY2VtYXBzXG4gICAgICByZXR1cm4gc291cmNlbWFwXG4gICAgICAgID8ge1xuICAgICAgICAgICAgY29kZTogbWFnaWMudG9TdHJpbmcoKSxcbiAgICAgICAgICAgIG1hcDogbWFnaWMuZ2VuZXJhdGVNYXAoe1xuICAgICAgICAgICAgICBzb3VyY2U6IGZpbGVOYW1lLFxuICAgICAgICAgICAgICBoaXJlczogdHJ1ZSxcbiAgICAgICAgICAgIH0pLFxuICAgICAgICAgIH1cbiAgICAgICAgOiB7IGNvZGU6IG1hZ2ljLnRvU3RyaW5nKCkgfVxuICAgIH0sXG5cbiAgICAvKiA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PSAqL1xuICAgIC8qICAgICAgICAgICAgICAgIEdFTkVSQVRFQlVORExFICAgICAgICAgICAgICAgICovXG4gICAgLyogPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0gKi9cblxuICAgIGFzeW5jIGdlbmVyYXRlQnVuZGxlKG9wdGlvbnMsIGJ1bmRsZSkge1xuICAgICAgLy8gR2V0IG1vZHVsZSBpZHMgZm9yIGFsbCBjaHVua3NcbiAgICAgIGNvbnN0IHBlcm1pc3Npb25zID0gQXJyYXkuZnJvbShcbiAgICAgICAgT2JqZWN0LnZhbHVlcyhidW5kbGUpLnJlZHVjZShcbiAgICAgICAgICAoc2V0LCB7IGNvZGUsIGZhY2FkZU1vZHVsZUlkOiBpZCB9KSA9PiB7XG4gICAgICAgICAgICAvLyBUaGUgb25seSB1c2UgZm9yIHRoaXMgaXMgdG8gZXhjbHVkZSBhIGNodW5rXG4gICAgICAgICAgICBpZiAoaWQgJiYgcGVybWlzc2lvbnNGaWx0ZXIoaWQpKSB7XG4gICAgICAgICAgICAgIHJldHVybiBuZXcgU2V0KFtcbiAgICAgICAgICAgICAgICAuLi5kZXJpdmVQZXJtaXNzaW9ucyhjb2RlKSxcbiAgICAgICAgICAgICAgICAuLi5zZXQsXG4gICAgICAgICAgICAgIF0pXG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICByZXR1cm4gc2V0XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSxcbiAgICAgICAgICBuZXcgU2V0KCksXG4gICAgICAgICksXG4gICAgICApXG5cbiAgICAgIGlmICh2ZXJib3NlKSB7XG4gICAgICAgIC8vIENvbXBhcmUgdG8gbGFzdCBwZXJtaXNzaW9uc1xuICAgICAgICBjb25zdCBwZXJtc0hhc2ggPSBKU09OLnN0cmluZ2lmeShwZXJtaXNzaW9ucylcblxuICAgICAgICBpZiAoIWNhY2hlLnBlcm1zSGFzaCkge1xuICAgICAgICAgIGNvbnNvbGUubG9nKCdEZXJpdmVkIHBlcm1pc3Npb25zOicsIHBlcm1pc3Npb25zKVxuICAgICAgICB9IGVsc2UgaWYgKHBlcm1zSGFzaCAhPT0gY2FjaGUucGVybXNIYXNoKSB7XG4gICAgICAgICAgY29uc29sZS5sb2coJ0Rlcml2ZWQgbmV3IHBlcm1pc3Npb25zOicsIHBlcm1pc3Npb25zKVxuICAgICAgICB9XG5cbiAgICAgICAgY2FjaGUucGVybXNIYXNoID0gcGVybXNIYXNoXG4gICAgICB9XG5cbiAgICAgIC8vIEVtaXQgbG9hZGVkIGFzc2V0cyBhbmRcbiAgICAgIC8vIENyZWF0ZSBhc3NldCBwYXRoIHVwZGF0ZXJzXG4gICAgICBjb25zdCBhc3NldFBhdGhNYXBGbnMgPSBhd2FpdCBnZXRBc3NldFBhdGhNYXBGbnMuY2FsbChcbiAgICAgICAgdGhpcyxcbiAgICAgICAgbG9hZGVkQXNzZXRzLFxuICAgICAgKVxuXG4gICAgICB0cnkge1xuICAgICAgICBjb25zdCBtYW5pZmVzdEJvZHkgPSBkZXJpdmVNYW5pZmVzdChcbiAgICAgICAgICBwa2csXG4gICAgICAgICAgLy8gVXBkYXRlIGFzc2V0IHBhdGhzIGFuZCByZXR1cm4gbWFuaWZlc3RcbiAgICAgICAgICBhc3NldFBhdGhNYXBGbnMucmVkdWNlKFxuICAgICAgICAgICAgbWFwT2JqZWN0VmFsdWVzLFxuICAgICAgICAgICAgY2FjaGUubWFuaWZlc3QsXG4gICAgICAgICAgKSxcbiAgICAgICAgICBwZXJtaXNzaW9ucyxcbiAgICAgICAgKVxuXG4gICAgICAgIC8vIEFkZCByZWxvYWRlciBzY3JpcHRcbiAgICAgICAgaWYgKF91c2VSZWxvYWRlcikge1xuICAgICAgICAgIGlmIChzdGFydFJlbG9hZGVyKSB7XG4gICAgICAgICAgICBhd2FpdCByZWxvYWRlci5zdGFydCgoc2hvdWxkU3RhcnQpID0+IHtcbiAgICAgICAgICAgICAgc3RhcnRSZWxvYWRlciA9IHNob3VsZFN0YXJ0XG4gICAgICAgICAgICB9KVxuXG4gICAgICAgICAgICBjb25zb2xlLmxvZygncmVsb2FkZXIgaXMgcnVubmluZy4uLicpXG4gICAgICAgICAgfVxuXG4gICAgICAgICAgLy8gVE9ETzogcmVsb2FkZXIgc2hvdWxkIGJlIHdyYXBwZWRcbiAgICAgICAgICAvLyAgICAgICBpbiBhIGR5bmFtaWMgaW1wb3J0XG4gICAgICAgICAgLy8gICAgICAgdG8gc3VwcG9ydCBtb2R1bGUgZmVhdHVyZXMuXG4gICAgICAgICAgcmVsb2FkZXIuY3JlYXRlQ2xpZW50RmlsZXMuY2FsbCh0aGlzKVxuXG4gICAgICAgICAgLy8gVE9ETzogaGVyZSwgY2xpZW50IHBhdGggc2hvdWxkIGJlIHRoZSB3cmFwcGVyIGZpbGUuXG4gICAgICAgICAgcmVsb2FkZXIudXBkYXRlTWFuaWZlc3QobWFuaWZlc3RCb2R5KVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHB1YmxpY0tleSkge1xuICAgICAgICAgIG1hbmlmZXN0Qm9keS5rZXkgPSBwdWJsaWNLZXlcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBkZWxldGUgbWFuaWZlc3RCb2R5LmtleVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gTXV0YXRlIGJ1bmRsZSB0byBlbWl0IGN1c3RvbSBhc3NldFxuICAgICAgICBidW5kbGVbbWFuaWZlc3ROYW1lXSA9IHtcbiAgICAgICAgICBmaWxlTmFtZTogbWFuaWZlc3ROYW1lLFxuICAgICAgICAgIGlzQXNzZXQ6IHRydWUsXG4gICAgICAgICAgc291cmNlOiBKU09OLnN0cmluZ2lmeShtYW5pZmVzdEJvZHksIG51bGwsIDIpLFxuICAgICAgICB9XG4gICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICBpZiAoZXJyb3IubmFtZSAhPT0gJ1ZhbGlkYXRpb25FcnJvcicpIHRocm93IGVycm9yXG5cbiAgICAgICAgZXJyb3IuZXJyb3JzLmZvckVhY2goKGVycikgPT4ge1xuICAgICAgICAgIGNvbnNvbGUubG9nKGVycilcbiAgICAgICAgfSlcblxuICAgICAgICB0aGlzLmVycm9yKGVycm9yLm1lc3NhZ2UpXG4gICAgICB9XG4gICAgfSxcblxuICAgIHdyaXRlQnVuZGxlKCkge1xuICAgICAgaWYgKF91c2VSZWxvYWRlciAmJiAhZmlyc3RSdW4pIHtcbiAgICAgICAgcmV0dXJuIHJlbG9hZGVyXG4gICAgICAgICAgLnJlbG9hZCgpXG4gICAgICAgICAgLnRoZW4oKCkgPT4ge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ3JlbG9hZCBzdWNjZXNzLi4uJylcbiAgICAgICAgICB9KVxuICAgICAgICAgIC5jYXRjaCgoZXJyb3IpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IG1lc3NhZ2UgPSBgJHtlcnJvci5tZXNzYWdlfSAoJHtlcnJvci5jb2RlfSlgXG4gICAgICAgICAgICB0aGlzLndhcm4obWVzc2FnZSlcbiAgICAgICAgICB9KVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZmlyc3RSdW4gPSBmYWxzZVxuICAgICAgfVxuICAgIH0sXG4gIH1cbn1cbiIsImltcG9ydCBodG1sSW5wdXRzIGZyb20gJy4vaHRtbC1pbnB1dHMvaW5kZXgnXG5pbXBvcnQgbWFuaWZlc3RJbnB1dCBmcm9tICcuL21hbmlmZXN0LWlucHV0L2luZGV4J1xuXG5leHBvcnQgZGVmYXVsdCBvcHRzID0+IHtcbiAgY29uc3QgbWFuaWZlc3QgPSBtYW5pZmVzdElucHV0KG9wdHMpXG4gIGNvbnN0IGh0bWwgPSBodG1sSW5wdXRzKG9wdHMpXG4gIGNvbnN0IHBsdWdpbnMgPSBbbWFuaWZlc3QsIGh0bWxdXG5cbiAgcmV0dXJuIHtcbiAgICBuYW1lOiAnY2hyb21lLWV4dGVuc2lvbicsXG5cbiAgICBvcHRpb25zKG9wdGlvbnMpIHtcbiAgICAgIHJldHVybiBwbHVnaW5zLnJlZHVjZShcbiAgICAgICAgKG8sIHApID0+IChwLm9wdGlvbnMgPyBwLm9wdGlvbnMuY2FsbCh0aGlzLCBvKSA6IG8pLFxuICAgICAgICBvcHRpb25zLFxuICAgICAgKVxuICAgIH0sXG5cbiAgICBidWlsZFN0YXJ0KG9wdGlvbnMpIHtcbiAgICAgIG1hbmlmZXN0LmJ1aWxkU3RhcnQuY2FsbCh0aGlzLCBvcHRpb25zKVxuICAgICAgaHRtbC5idWlsZFN0YXJ0LmNhbGwodGhpcywgb3B0aW9ucylcbiAgICB9LFxuXG4gICAgd2F0Y2hDaGFuZ2UoaWQpIHtcbiAgICAgIG1hbmlmZXN0LndhdGNoQ2hhbmdlLmNhbGwodGhpcywgaWQpXG4gICAgICBodG1sLndhdGNoQ2hhbmdlLmNhbGwodGhpcywgaWQpXG4gICAgfSxcblxuICAgIHJlbmRlckNodW5rKC4uLmFyZ3MpIHtcbiAgICAgIHJldHVybiBtYW5pZmVzdC5yZW5kZXJDaHVuay5jYWxsKHRoaXMsIC4uLmFyZ3MpXG4gICAgfSxcblxuICAgIGFzeW5jIGdlbmVyYXRlQnVuZGxlKC4uLmFyZ3MpIHtcbiAgICAgIGNvbnN0IGhvb2sgPSAnZ2VuZXJhdGVCdW5kbGUnXG5cbiAgICAgIGF3YWl0IFByb21pc2UuYWxsKFtcbiAgICAgICAgbWFuaWZlc3RbaG9va10uY2FsbCh0aGlzLCAuLi5hcmdzKSxcbiAgICAgICAgaHRtbFtob29rXS5jYWxsKHRoaXMsIC4uLmFyZ3MpLFxuICAgICAgXSlcbiAgICB9LFxuXG4gICAgd3JpdGVCdW5kbGUoKSB7XG4gICAgICBtYW5pZmVzdC53cml0ZUJ1bmRsZS5jYWxsKHRoaXMpXG4gICAgfSxcbiAgfVxufVxuIl0sIm5hbWVzIjpbIm5hbWUiLCJkcCIsImRlcml2ZUVudHJpZXMiLCJjcmVhdGVGaWx0ZXIiLCJkZXJpdmVNYW5pZmVzdCJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7QUFLTyxNQUFNLGFBQWEsR0FBRyxTQUFTO0VBQ3BDLEVBQUUsQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLFNBQVMsRUFBRSxHQUFHLENBQUMsRUFBQzs7QUFFdEQsQUFBTyxNQUFNLFNBQVMsR0FBRyxDQUFDLEVBQUUsRUFBRSxFQUFFLEtBQUssRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUM7O0FBRWpFLEFBQU8sZUFBZSxrQkFBa0IsQ0FBQyxNQUFNLEVBQUU7RUFDL0MsT0FBTyxDQUFDLE1BQU0sTUFBTSxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUMsU0FBUyxFQUFFLFFBQVEsQ0FBQyxLQUFLO0lBQ25ELE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsU0FBUyxFQUFDO0lBQ3JDLE1BQU0sRUFBRSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLFFBQVEsRUFBQztJQUN6QyxNQUFNLGFBQWEsR0FBRyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsRUFBRSxFQUFDOztJQUUv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
