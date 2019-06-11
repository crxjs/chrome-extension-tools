import path from 'path';
import fs from 'fs-extra';
import cheerio from 'cheerio';
import { derivePermissions, deriveEntries, deriveManifest } from '@bumble/manifest';
import isValidPath from 'is-valid-path';
import MagicString from 'magic-string';
import memoize from 'mem';
import pm from 'picomatch';
import { createFilter } from 'rollup-pluginutils';

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

  const derivePermissions$1 = memoize(derivePermissions);

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
      const { assetPaths, entryPaths } = deriveEntries(
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
      iiafeFilter = createFilter(
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
                ...derivePermissions$1(code),
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
        const manifestBody = deriveManifest(
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

export default index;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hyb21lLWV4dGVuc2lvbi1lc20uanMiLCJzb3VyY2VzIjpbIi4uL3NyYy9oZWxwZXJzLmpzIiwiLi4vc3JjL2h0bWwtaW5wdXRzL2NoZWVyaW8uanMiLCIuLi9zcmMvaHRtbC1pbnB1dHMvaGVscGVycy5qcyIsIi4uL3NyYy9odG1sLWlucHV0cy9pbmRleC5qcyIsIi4uL3NyYy9tYW5pZmVzdC1pbnB1dC9tYXBPYmplY3RWYWx1ZXMuanMiLCIuLi9zcmMvbWFuaWZlc3QtaW5wdXQvaW5kZXguanMiLCIuLi9zcmMvaW5kZXguanMiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IGZzIGZyb20gJ2ZzLWV4dHJhJ1xuaW1wb3J0IHBhdGggZnJvbSAncGF0aCdcblxuZXhwb3J0IGNvbnN0IG5vdCA9IGZuID0+IHggPT4gIWZuKHgpXG5cbmV4cG9ydCBjb25zdCBsb2FkQXNzZXREYXRhID0gYXNzZXRQYXRoID0+XG4gIGZzLnJlYWRGaWxlKGFzc2V0UGF0aCkudGhlbihzcmMgPT4gW2Fzc2V0UGF0aCwgc3JjXSlcblxuZXhwb3J0IGNvbnN0IHppcEFycmF5cyA9IChhMSwgYTIpID0+IGExLm1hcCgoeCwgaSkgPT4gW3gsIGEyW2ldXSlcblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGdldEFzc2V0UGF0aE1hcEZucyhhc3NldHMpIHtcbiAgcmV0dXJuIChhd2FpdCBhc3NldHMpLm1hcCgoW2Fzc2V0UGF0aCwgYXNzZXRTcmNdKSA9PiB7XG4gICAgY29uc3QgbmFtZSA9IHBhdGguYmFzZW5hbWUoYXNzZXRQYXRoKVxuICAgIGNvbnN0IGlkID0gdGhpcy5lbWl0QXNzZXQobmFtZSwgYXNzZXRTcmMpXG4gICAgY29uc3QgYXNzZXRGaWxlTmFtZSA9IHRoaXMuZ2V0QXNzZXRGaWxlTmFtZShpZClcblxuICAgIHJldHVybiB4ID0+IHtcbiAgICAgIGlmICh0eXBlb2YgeCAhPT0gJ3N0cmluZycpIHJldHVybiB4XG5cbiAgICAgIGlmIChhc3NldFBhdGguZW5kc1dpdGgoeCkpIHtcbiAgICAgICAgcmV0dXJuIGFzc2V0RmlsZU5hbWVcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiB4XG4gICAgICB9XG4gICAgfVxuICB9KVxufVxuXG5leHBvcnQgY29uc3Qgd3JpdGVGaWxlID0gZGVzdCA9PiAoW2h0bWxQYXRoLCBodG1sU3JjXSkgPT4ge1xuICBjb25zdCBiYXNlTmFtZSA9IHBhdGguYmFzZW5hbWUoaHRtbFBhdGgpXG4gIGNvbnN0IGRlc3RQYXRoID0gcGF0aC5qb2luKGRlc3QsIGJhc2VOYW1lKVxuICByZXR1cm4gZnMud3JpdGVGaWxlKGRlc3RQYXRoLCBodG1sU3JjKVxufVxuIiwiaW1wb3J0IHBhdGggZnJvbSAncGF0aCdcbmltcG9ydCBmcyBmcm9tICdmcy1leHRyYSdcbmltcG9ydCBjaGVlcmlvIGZyb20gJ2NoZWVyaW8nXG5cbmV4cG9ydCBjb25zdCBsb2FkSHRtbCA9IChmaWxlUGF0aCkgPT4ge1xuICBjb25zdCBodG1sQ29kZSA9IGZzLnJlYWRGaWxlU3luYyhmaWxlUGF0aCwgJ3V0ZjgnKVxuICBjb25zdCAkID0gY2hlZXJpby5sb2FkKGh0bWxDb2RlKVxuXG4gIHJldHVybiAkXG59XG5cbmNvbnN0IGdldFJlbGF0aXZlUGF0aCA9IChodG1sUGF0aCkgPT4gKHApID0+XG4gIHBhdGguam9pbihwYXRoLmRpcm5hbWUoaHRtbFBhdGgpLCBwKVxuXG5jb25zdCBnZXRFbnRyaWVzID0gKCQpID0+XG4gICQoJ3NjcmlwdCcpXG4gICAgLm5vdCgnW2RhdGEtcm9sbHVwLWFzc2V0XScpXG4gICAgLm5vdCgnW3NyY149XCJodHRwOlwiXScpXG4gICAgLm5vdCgnW3NyY149XCJodHRwczpcIl0nKVxuICAgIC5ub3QoJ1tzcmNePVwiZGF0YTpcIl0nKVxuICAgIC5ub3QoJ1tzcmNePVwiL1wiXScpXG4gICAgLnRvQXJyYXkoKVxuXG5leHBvcnQgY29uc3QgZ2V0SnNFbnRyaWVzID0gKFtodG1sUGF0aCwgJF0pID0+XG4gIGdldEVudHJpZXMoJClcbiAgICAubWFwKChlbGVtKSA9PiAkKGVsZW0pLmF0dHIoJ3NyYycpKVxuICAgIC5tYXAoZ2V0UmVsYXRpdmVQYXRoKGh0bWxQYXRoKSlcblxuZXhwb3J0IGNvbnN0IG11dGF0ZUpzRW50cmllcyA9ICgkKSA9PiB7XG4gIGdldEVudHJpZXMoJClcbiAgICAubWFwKChlbGVtKSA9PiAkKGVsZW0pKVxuICAgIC5mb3JFYWNoKChlKSA9PiB7XG4gICAgICBlLmF0dHIoJ3R5cGUnLCAnbW9kdWxlJylcbiAgICB9KVxuXG4gIHJldHVybiAkXG59XG5cbi8qIC0tLS0tLS0tLS0tLS0tLS0tIGpzIGFzc2V0cyAtLS0tLS0tLS0tLS0tLS0tICovXG5cbmNvbnN0IGdldEFzc2V0cyA9ICgkKSA9PlxuICAkKCdzY3JpcHQnKVxuICAgIC5maWx0ZXIoJ1tkYXRhLXJvbGx1cC1hc3NldD1cInRydWVcIl0nKVxuICAgIC5ub3QoJ1tzcmNePVwiaHR0cDpcIl0nKVxuICAgIC5ub3QoJ1tzcmNePVwiaHR0cHM6XCJdJylcbiAgICAubm90KCdbc3JjXj1cImRhdGE6XCJdJylcbiAgICAubm90KCdbc3JjXj1cIi9cIl0nKVxuICAgIC50b0FycmF5KClcblxuZXhwb3J0IGNvbnN0IGdldEpzQXNzZXRzID0gKFtodG1sUGF0aCwgJF0pID0+XG4gIGdldEFzc2V0cygkKVxuICAgIC5tYXAoKGVsZW0pID0+ICQoZWxlbSkuYXR0cignc3JjJykpXG4gICAgLm1hcChnZXRSZWxhdGl2ZVBhdGgoaHRtbFBhdGgpKVxuXG5leHBvcnQgY29uc3QgbXV0YXRlSnNBc3NldHMgPSAoJCwgZm4pID0+IHtcbiAgZ2V0QXNzZXRzKCQpXG4gICAgLm1hcCgoZWxlbSkgPT4gJChlbGVtKSlcbiAgICAuZm9yRWFjaCgoZSkgPT4ge1xuICAgICAgY29uc3QgdmFsdWUgPSBmbihlLmF0dHIoJ3NyYycpKVxuICAgICAgZS5hdHRyKCdzcmMnLCB2YWx1ZSlcbiAgICB9KVxuXG4gIHJldHVybiAkXG59XG5cbi8qIC0tLS0tLS0tLS0tLS0tLS0tLS0tIGNzcyAtLS0tLS0tLS0tLS0tLS0tLS0tICovXG5cbmNvbnN0IGdldENzcyA9ICgkKSA9PlxuICAkKCdsaW5rJylcbiAgICAuZmlsdGVyKCdbcmVsPVwic3R5bGVzaGVldFwiXScpXG4gICAgLm5vdCgnW2hyZWZePVwiaHR0cDpcIl0nKVxuICAgIC5ub3QoJ1tocmVmXj1cImh0dHBzOlwiXScpXG4gICAgLm5vdCgnW2hyZWZePVwiZGF0YTpcIl0nKVxuICAgIC5ub3QoJ1tocmVmXj1cIi9cIl0nKVxuICAgIC50b0FycmF5KClcblxuZXhwb3J0IGNvbnN0IGdldENzc0hyZWZzID0gKFtodG1sUGF0aCwgJF0pID0+XG4gIGdldENzcygkKVxuICAgIC5tYXAoKGVsZW0pID0+ICQoZWxlbSkuYXR0cignaHJlZicpKVxuICAgIC5tYXAoZ2V0UmVsYXRpdmVQYXRoKGh0bWxQYXRoKSlcblxuZXhwb3J0IGNvbnN0IG11dGF0ZUNzc0hyZWZzID0gKCQsIGZuKSA9PiB7XG4gIGdldENzcygkKVxuICAgIC5tYXAoKGVsZW0pID0+ICQoZWxlbSkpXG4gICAgLmZvckVhY2goKGUpID0+IHtcbiAgICAgIGNvbnN0IHZhbHVlID0gZm4oZS5hdHRyKCdocmVmJykpXG4gICAgICBlLmF0dHIoJ2hyZWYnLCB2YWx1ZSlcbiAgICB9KVxuXG4gIHJldHVybiAkXG59XG5cbi8qIC0tLS0tLS0tLS0tLS0tLS0tLS0tIGltZyAtLS0tLS0tLS0tLS0tLS0tLS0tICovXG5jb25zdCBnZXRJbWdzID0gKCQpID0+XG4gICQoJ2ltZycpXG4gICAgLm5vdCgnW3NyY149XCJodHRwOi8vXCJdJylcbiAgICAubm90KCdbc3JjXj1cImh0dHBzOi8vXCJdJylcbiAgICAubm90KCdbc3JjXj1cImRhdGE6XCJdJylcbiAgICAubm90KCdbc3JjXj1cIi9cIl0nKVxuICAgIC50b0FycmF5KClcblxuY29uc3QgZ2V0RmF2aWNvbnMgPSAoJCkgPT5cbiAgJCgnbGlua1tyZWw9XCJpY29uXCJdJylcbiAgICAubm90KCdbaHJlZl49XCJodHRwOlwiXScpXG4gICAgLm5vdCgnW2hyZWZePVwiaHR0cHM6XCJdJylcbiAgICAubm90KCdbaHJlZl49XCJkYXRhOlwiXScpXG4gICAgLm5vdCgnW2hyZWZePVwiL1wiXScpXG4gICAgLnRvQXJyYXkoKVxuXG5leHBvcnQgY29uc3QgZ2V0SW1nU3JjcyA9IChbaHRtbFBhdGgsICRdKSA9PiB7XG4gIHJldHVybiBbXG4gICAgLi4uZ2V0SW1ncygkKS5tYXAoKGVsZW0pID0+ICQoZWxlbSkuYXR0cignc3JjJykpLFxuICAgIC8vIGdldCBmYXZpY29uc1xuICAgIC4uLmdldEZhdmljb25zKCQpLm1hcCgoZWxlbSkgPT4gJChlbGVtKS5hdHRyKCdocmVmJykpLFxuICBdLm1hcChnZXRSZWxhdGl2ZVBhdGgoaHRtbFBhdGgpKVxufVxuXG5leHBvcnQgY29uc3QgbXV0YXRlSW1nU3JjcyA9ICgkLCBmbikgPT4ge1xuICBnZXRJbWdzKCQpXG4gICAgLm1hcCgoZWxlbSkgPT4gJChlbGVtKSlcbiAgICAuZm9yRWFjaCgoZSkgPT4ge1xuICAgICAgY29uc3QgdmFsdWUgPSBmbihlLmF0dHIoJ3NyYycpKVxuICAgICAgZS5hdHRyKCdzcmMnLCB2YWx1ZSlcbiAgICB9KVxuXG4gIGdldEZhdmljb25zKCQpXG4gICAgLm1hcCgoZWxlbSkgPT4gJChlbGVtKSlcbiAgICAuZm9yRWFjaCgoZSkgPT4ge1xuICAgICAgY29uc3QgdmFsdWUgPSBmbihlLmF0dHIoJ2hyZWYnKSlcbiAgICAgIGUuYXR0cignaHJlZicsIHZhbHVlKVxuICAgIH0pXG5cbiAgcmV0dXJuICRcbn1cbiIsImltcG9ydCB7IGxvYWRBc3NldERhdGEgfSBmcm9tICcuLi9oZWxwZXJzJ1xuaW1wb3J0IHsgZ2V0Q3NzSHJlZnMsIGdldEltZ1NyY3MsIGdldEpzQXNzZXRzIH0gZnJvbSAnLi9jaGVlcmlvJ1xuXG4vKiAtLS0tLS0tLS0tLS0tIGhlbHBlciBmdW5jdGlvbnMgLS0tLS0tLS0tLS0tLSAqL1xuXG5leHBvcnQgY29uc3Qgbm90ID0gZm4gPT4geCA9PiAhZm4oeClcblxuZXhwb3J0IGNvbnN0IGlzSHRtbCA9IHBhdGggPT4gL1xcLmh0bWw/JC8udGVzdChwYXRoKVxuXG5leHBvcnQgY29uc3QgbG9hZEh0bWxBc3NldHMgPSBodG1sRGF0YSA9PlxuICBQcm9taXNlLmFsbChcbiAgICBodG1sRGF0YS5tYXAoYXN5bmMgZGF0YSA9PlxuICAgICAgZGF0YS5jb25jYXQoe1xuICAgICAgICBqczogYXdhaXQgUHJvbWlzZS5hbGwoXG4gICAgICAgICAgZ2V0SnNBc3NldHMoZGF0YSkubWFwKGxvYWRBc3NldERhdGEpLFxuICAgICAgICApLFxuICAgICAgICBpbWc6IGF3YWl0IFByb21pc2UuYWxsKFxuICAgICAgICAgIGdldEltZ1NyY3MoZGF0YSkubWFwKGxvYWRBc3NldERhdGEpLFxuICAgICAgICApLFxuICAgICAgICBjc3M6IGF3YWl0IFByb21pc2UuYWxsKFxuICAgICAgICAgIGdldENzc0hyZWZzKGRhdGEpLm1hcChsb2FkQXNzZXREYXRhKSxcbiAgICAgICAgKSxcbiAgICAgIH0pLFxuICAgICksXG4gIClcbiIsImltcG9ydCBwYXRoIGZyb20gJ3BhdGgnXG5pbXBvcnQgeyBnZXRBc3NldFBhdGhNYXBGbnMsIHppcEFycmF5cyB9IGZyb20gJy4uL2hlbHBlcnMnXG5pbXBvcnQge1xuICBnZXRKc0VudHJpZXMsXG4gIGxvYWRIdG1sLFxuICBtdXRhdGVDc3NIcmVmcyxcbiAgbXV0YXRlSW1nU3JjcyxcbiAgbXV0YXRlSnNBc3NldHMsXG4gIG11dGF0ZUpzRW50cmllcyxcbn0gZnJvbSAnLi9jaGVlcmlvJ1xuaW1wb3J0IHsgaXNIdG1sLCBsb2FkSHRtbEFzc2V0cywgbm90IH0gZnJvbSAnLi9oZWxwZXJzJ1xuXG5jb25zdCBuYW1lID0gJ2h0bWwtaW5wdXRzJ1xuXG4vKiA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PSAqL1xuLyogICAgICAgICAgICAgICAgICBIVE1MLUlOUFVUUyAgICAgICAgICAgICAgICAgKi9cbi8qID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09ICovXG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIGh0bWxJbnB1dHMoKSB7XG4gIC8qIC0tLS0tLS0tLS0tLS0tIGhvb2tzIGNsb3N1cmVzIC0tLS0tLS0tLS0tLS0tICovXG5cbiAgY29uc3QgY2FjaGUgPSB7fVxuXG4gIC8vIEFzc2V0cyB3aWxsIGJlIGEgUHJvbWlzZVxuICBsZXQgaHRtbEFzc2V0c1xuICBsZXQganNFbnRyaWVzXG5cbiAgLyogLS0tLS0tLS0tLS0tLS0tIHBsdWdpbiBvYmplY3QgLS0tLS0tLS0tLS0tLS0gKi9cbiAgcmV0dXJuIHtcbiAgICBuYW1lLFxuXG4gICAgLyogPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0gKi9cbiAgICAvKiAgICAgICAgICAgICAgICAgT1BUSU9OUyBIT09LICAgICAgICAgICAgICAgICAqL1xuICAgIC8qID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09ICovXG5cbiAgICBvcHRpb25zKG9wdGlvbnMpIHtcbiAgICAgIC8vIFNraXAgaWYgY2FjaGUuaW5wdXQgZXhpc3RzXG4gICAgICBpZiAoY2FjaGUuaW5wdXQpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAuLi5vcHRpb25zLFxuICAgICAgICAgIGlucHV0OiBjYWNoZS5pbnB1dCxcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICAvLyBDYXN0IG9wdGlvbnMuaW5wdXQgdG8gYXJyYXlcbiAgICAgIGlmICh0eXBlb2Ygb3B0aW9ucy5pbnB1dCA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgb3B0aW9ucy5pbnB1dCA9IFtvcHRpb25zLmlucHV0XVxuICAgICAgfVxuXG4gICAgICAvLyBGaWx0ZXIgaHRtIGFuZCBodG1sIGZpbGVzXG4gICAgICBjYWNoZS5odG1sUGF0aHMgPSBvcHRpb25zLmlucHV0LmZpbHRlcihpc0h0bWwpXG5cbiAgICAgIC8vIFNraXAgaWYgbm8gaHRtbCBmaWxlc1xuICAgICAgaWYgKCFjYWNoZS5odG1sUGF0aHMubGVuZ3RoKSB7XG4gICAgICAgIGh0bWxBc3NldHMgPSBQcm9taXNlLnJlc29sdmUoW10pXG4gICAgICAgIHJldHVybiBvcHRpb25zXG4gICAgICB9XG5cbiAgICAgIC8qIC0tLS0tLS0tLS0tLS0tIExvYWQgaHRtbCBmaWxlcyAtLS0tLS0tLS0tLS0tICovXG5cbiAgICAgIGNvbnN0IGh0bWwkID0gY2FjaGUuaHRtbFBhdGhzLm1hcChsb2FkSHRtbClcblxuICAgICAgY29uc3QgaHRtbERhdGEgPSB6aXBBcnJheXMoY2FjaGUuaHRtbFBhdGhzLCBodG1sJClcblxuICAgICAgLy8gU3RhcnQgYXN5bmMgbG9hZCBmb3IgaHRtbCBhc3NldHNcbiAgICAgIC8vIE5FWFQ6IHJlbG9hZCBodG1sIGFzc2V0cyBvbiBjaGFuZ2VcbiAgICAgIGh0bWxBc3NldHMgPSBsb2FkSHRtbEFzc2V0cyhodG1sRGF0YSlcblxuICAgICAgLy8gR2V0IEpTIGVudHJ5IGZpbGUgbmFtZXNcbiAgICAgIGpzRW50cmllcyA9IGh0bWxEYXRhLmZsYXRNYXAoZ2V0SnNFbnRyaWVzKVxuXG4gICAgICAvLyBDYWNoZSBqc0VudHJpZXMgd2l0aCBleGlzdGluZyBvcHRpb25zLmlucHV0XG4gICAgICBjYWNoZS5pbnB1dCA9IG9wdGlvbnMuaW5wdXRcbiAgICAgICAgLmZpbHRlcihub3QoaXNIdG1sKSlcbiAgICAgICAgLmNvbmNhdChqc0VudHJpZXMpXG5cbiAgICAgIHJldHVybiB7XG4gICAgICAgIC4uLm9wdGlvbnMsXG4gICAgICAgIGlucHV0OiBjYWNoZS5pbnB1dCxcbiAgICAgIH1cbiAgICB9LFxuXG4gICAgLyogPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0gKi9cbiAgICAvKiAgICAgICAgICAgICAgSEFORExFIEZJTEUgQ0hBTkdFUyAgICAgICAgICAgICAqL1xuICAgIC8qID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09ICovXG5cbiAgICBidWlsZFN0YXJ0KCkge1xuICAgICAgY2FjaGUuaHRtbFBhdGhzLmZvckVhY2goKGh0bWxQYXRoKSA9PiB7XG4gICAgICAgIHRoaXMuYWRkV2F0Y2hGaWxlKGh0bWxQYXRoKVxuICAgICAgfSlcbiAgICB9LFxuXG4gICAgd2F0Y2hDaGFuZ2UoaWQpIHtcbiAgICAgIGlmIChpZC5lbmRzV2l0aCgnLmh0bWwnKSkge1xuICAgICAgICBjYWNoZS5pbnB1dCA9IG51bGxcbiAgICAgIH1cbiAgICB9LFxuXG4gICAgLyogPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0gKi9cbiAgICAvKiAgICAgICAgICAgICAgICBHRU5FUkFURUJVTkRMRSAgICAgICAgICAgICAgICAqL1xuICAgIC8qID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09ICovXG5cbiAgICBhc3luYyBnZW5lcmF0ZUJ1bmRsZShvcHRpb25zLCBidW5kbGUpIHtcbiAgICAgIC8vIENPTkNFUk46IHJlbGF0aXZlIHBhdGhzIHdpdGhpbiBDU1MgZmlsZXMgd2lsbCBmYWlsXG4gICAgICAvLyBTT0xVVElPTjogdXNlIHBvc3Rjc3MgdG8gcHJvY2VzcyBDU1MgYXNzZXQgc3JjXG4gICAgICBhd2FpdCBQcm9taXNlLmFsbChcbiAgICAgICAgKGF3YWl0IGh0bWxBc3NldHMpLm1hcChcbiAgICAgICAgICBhc3luYyAoW2h0bWxQYXRoLCAkLCB7IGpzLCBpbWcsIGNzcyB9XSkgPT4ge1xuICAgICAgICAgICAgY29uc3QgaHRtbE5hbWUgPSBwYXRoLmJhc2VuYW1lKGh0bWxQYXRoKVxuXG4gICAgICAgICAgICAvLyBTZXR1cCBmaWxlIHBhdGggbWFwcGluZyBmbnNcbiAgICAgICAgICAgIGNvbnN0IGpzRm5zID0gYXdhaXQgZ2V0QXNzZXRQYXRoTWFwRm5zLmNhbGwodGhpcywganMpXG4gICAgICAgICAgICBjb25zdCBpbWdGbnMgPSBhd2FpdCBnZXRBc3NldFBhdGhNYXBGbnMuY2FsbChcbiAgICAgICAgICAgICAgdGhpcyxcbiAgICAgICAgICAgICAgaW1nLFxuICAgICAgICAgICAgKVxuICAgICAgICAgICAgY29uc3QgY3NzRm5zID0gYXdhaXQgZ2V0QXNzZXRQYXRoTWFwRm5zLmNhbGwoXG4gICAgICAgICAgICAgIHRoaXMsXG4gICAgICAgICAgICAgIGNzcyxcbiAgICAgICAgICAgIClcblxuICAgICAgICAgICAgLy8gVXBkYXRlIGh0bWwgZmlsZSB3aXRoIG5ld1xuICAgICAgICAgICAgLy8gc2NyaXB0IGFuZCBhc3NldCBmaWxlIHBhdGhzXG4gICAgICAgICAgICBtdXRhdGVKc0VudHJpZXMoJClcbiAgICAgICAgICAgIGpzRm5zLnJlZHVjZShtdXRhdGVKc0Fzc2V0cywgJClcbiAgICAgICAgICAgIGNzc0Zucy5yZWR1Y2UobXV0YXRlQ3NzSHJlZnMsICQpXG4gICAgICAgICAgICBpbWdGbnMucmVkdWNlKG11dGF0ZUltZ1NyY3MsICQpXG5cbiAgICAgICAgICAgIC8vIEFkZCBjdXN0b20gYXNzZXQgdG8gYnVuZGxlXG4gICAgICAgICAgICBidW5kbGVbaHRtbE5hbWVdID0ge1xuICAgICAgICAgICAgICBmaWxlTmFtZTogaHRtbE5hbWUsXG4gICAgICAgICAgICAgIGlzQXNzZXQ6IHRydWUsXG4gICAgICAgICAgICAgIHNvdXJjZTogJC5odG1sKCksXG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSxcbiAgICAgICAgKSxcbiAgICAgIClcbiAgICB9LFxuICB9XG59XG4iLCJleHBvcnQgY29uc3QgbWFwT2JqZWN0VmFsdWVzID0gKG9iaiwgZm4pID0+XG4gIE9iamVjdC5lbnRyaWVzKG9iaikucmVkdWNlKChyLCBba2V5LCB2YWx1ZV0pID0+IHtcbiAgICBpZiAodHlwZW9mIHZhbHVlICE9PSAnb2JqZWN0Jykge1xuICAgICAgLy8gaXMgcHJpbWl0aXZlXG4gICAgICByZXR1cm4geyAuLi5yLCBba2V5XTogZm4odmFsdWUpIH1cbiAgICB9IGVsc2UgaWYgKEFycmF5LmlzQXJyYXkodmFsdWUpKSB7XG4gICAgICAvLyBpcyBhcnJheVxuICAgICAgcmV0dXJuIHsgLi4uciwgW2tleV06IHZhbHVlLm1hcChmbikgfVxuICAgIH0gZWxzZSB7XG4gICAgICAvLyBpcyBwbGFpbiBvYmplY3RcbiAgICAgIHJldHVybiB7IC4uLnIsIFtrZXldOiBtYXBPYmplY3RWYWx1ZXModmFsdWUsIGZuKSB9XG4gICAgfVxuICB9LCB7fSlcbiIsImltcG9ydCB7XG4gIGRlcml2ZUVudHJpZXMsXG4gIGRlcml2ZU1hbmlmZXN0LFxuICBkZXJpdmVQZXJtaXNzaW9ucyBhcyBkcCxcbn0gZnJvbSAnQGJ1bWJsZS9tYW5pZmVzdCdcbmltcG9ydCBmcyBmcm9tICdmcy1leHRyYSdcbmltcG9ydCBpc1ZhbGlkUGF0aCBmcm9tICdpcy12YWxpZC1wYXRoJ1xuaW1wb3J0IE1hZ2ljU3RyaW5nIGZyb20gJ21hZ2ljLXN0cmluZydcbmltcG9ydCBtZW1vaXplIGZyb20gJ21lbSdcbmltcG9ydCBwYXRoIGZyb20gJ3BhdGgnXG5pbXBvcnQgcG0gZnJvbSAncGljb21hdGNoJ1xuaW1wb3J0IHsgY3JlYXRlRmlsdGVyIH0gZnJvbSAncm9sbHVwLXBsdWdpbnV0aWxzJ1xuaW1wb3J0IHsgZ2V0QXNzZXRQYXRoTWFwRm5zLCBsb2FkQXNzZXREYXRhIH0gZnJvbSAnLi4vaGVscGVycydcbmltcG9ydCB7IG1hcE9iamVjdFZhbHVlcyB9IGZyb20gJy4vbWFwT2JqZWN0VmFsdWVzJ1xuXG5jb25zdCBuYW1lID0gJ21hbmlmZXN0LWlucHV0J1xuXG4vKiAtLS0tIHByZWRpY2F0ZSBvYmplY3QgZm9yIGRlcml2ZUVudHJpZXMgLS0tLSAqL1xuLy8gY29uc3QgcHJlZE9iaiA9IHtcbi8vICAganM6IHMgPT4gL1xcLmpzJC8udGVzdChzKSxcbi8vICAgY3NzOiBzID0+IC9cXC5jc3MkLy50ZXN0KHMpLFxuLy8gICBodG1sOiBzID0+IC9cXC5odG1sJC8udGVzdChzKSxcbi8vICAgaW1nOiBzID0+IC9cXC5wbmckLy50ZXN0KHMpLFxuLy8gICBmaWx0ZXI6IHYgPT5cbi8vICAgICB0eXBlb2YgdiA9PT0gJ3N0cmluZycgJiZcbi8vICAgICB2LmluY2x1ZGVzKCcuJykgJiZcbi8vICAgICAhdi5pbmNsdWRlcygnKicpICYmXG4vLyAgICAgIS9eaHR0cHM/Oi8udGVzdCh2KSxcbi8vIH1cblxuY29uc3QgbnBtUGtnRGV0YWlscyA9IHtcbiAgbmFtZTogcHJvY2Vzcy5lbnYubnBtX3BhY2thZ2VfbmFtZSxcbiAgdmVyc2lvbjogcHJvY2Vzcy5lbnYubnBtX3BhY2thZ2VfdmVyc2lvbixcbiAgZGVzY3JpcHRpb246IHByb2Nlc3MuZW52Lm5wbV9wYWNrYWdlX2Rlc2NyaXB0aW9uLFxufVxuXG4vKiA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PSAqL1xuLyogICAgICAgICAgICAgICAgTUFOSUZFU1QtSU5QVVQgICAgICAgICAgICAgICAgKi9cbi8qID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09ICovXG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKHtcbiAgcGtnLFxuICB2ZXJib3NlLFxuICBwZXJtaXNzaW9ucyA9IHt9LFxuICBhc3NldHMgPSB7XG4gICAgaW5jbHVkZTogWycqKi8qLnBuZycsICcqKi8qLmNzcyddLFxuICB9LFxuICBlbnRyaWVzID0ge1xuICAgIGluY2x1ZGU6IFsnKiovKiddLFxuICB9LFxuICBpaWFmZSA9IHtcbiAgICAvLyBpbmNsdWRlIGlzIGRlZmF1bHRlZCB0byBbXSwgc28gZXhjbHVkZSBjYW4gYmUgdXNlZCBieSBpdHNlbGZcbiAgfSxcbiAgcHVibGljS2V5LFxuICB1c2VSZWxvYWRlciA9IHByb2Nlc3MuZW52LlJPTExVUF9XQVRDSCxcbiAgcmVsb2FkZXIsXG59ID0ge30pIHtcbiAgaWYgKCFwa2cpIHtcbiAgICBwa2cgPSBucG1Qa2dEZXRhaWxzXG4gIH1cblxuICBsZXQgX3VzZVJlbG9hZGVyID0gdXNlUmVsb2FkZXIgJiYgcmVsb2FkZXJcbiAgbGV0IHN0YXJ0UmVsb2FkZXIgPSB0cnVlXG4gIGxldCBmaXJzdFJ1biA9IHRydWVcblxuICAvKiAtLS0tLS0tLS0tLS0tLSBob29rcyBjbG9zdXJlcyAtLS0tLS0tLS0tLS0tLSAqL1xuICBpaWFmZS5pbmNsdWRlID0gaWlhZmUuaW5jbHVkZSB8fCBbXVxuICBsZXQgaWlhZmVGaWx0ZXJcblxuICBsZXQgbG9hZGVkQXNzZXRzXG4gIGxldCBzcmNEaXJcblxuICBsZXQgbWFuaWZlc3RQYXRoXG5cbiAgY29uc3QgY2FjaGUgPSB7fVxuXG4gIGNvbnN0IG1hbmlmZXN0TmFtZSA9ICdtYW5pZmVzdC5qc29uJ1xuXG4gIGNvbnN0IHBlcm1pc3Npb25zRmlsdGVyID0gcG0oXG4gICAgcGVybWlzc2lvbnMuaW5jbHVkZSB8fCAnKiovKicsXG4gICAgcGVybWlzc2lvbnMuZXhjbHVkZSxcbiAgKVxuXG4gIGNvbnN0IGFzc2V0RmlsdGVyID0gcG0oYXNzZXRzLmluY2x1ZGUsIHtcbiAgICBpZ25vcmU6IGFzc2V0cy5leGNsdWRlLFxuICB9KVxuXG4gIGNvbnN0IGVudHJ5RmlsdGVyID0gcG0oZW50cmllcy5pbmNsdWRlLCB7XG4gICAgaWdub3JlOiBlbnRyaWVzLmV4Y2x1ZGUsXG4gIH0pXG5cbiAgY29uc3QgZGVyaXZlUGVybWlzc2lvbnMgPSBtZW1vaXplKGRwKVxuXG4gIC8qIC0tLS0tLS0tLS0tLS0tLSBwbHVnaW4gb2JqZWN0IC0tLS0tLS0tLS0tLS0tICovXG4gIHJldHVybiB7XG4gICAgbmFtZSxcblxuICAgIC8qID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09ICovXG4gICAgLyogICAgICAgICAgICAgICAgIE9QVElPTlMgSE9PSyAgICAgICAgICAgICAgICAgKi9cbiAgICAvKiA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PSAqL1xuXG4gICAgb3B0aW9ucyhvcHRpb25zKSB7XG4gICAgICAvLyBEbyBub3QgcmVsb2FkIG1hbmlmZXN0IHdpdGhvdXQgY2hhbmdlc1xuICAgICAgaWYgKGNhY2hlLm1hbmlmZXN0KSB7XG4gICAgICAgIHJldHVybiB7IC4uLm9wdGlvbnMsIGlucHV0OiBjYWNoZS5pbnB1dCB9XG4gICAgICB9XG5cbiAgICAgIG1hbmlmZXN0UGF0aCA9IG9wdGlvbnMuaW5wdXRcbiAgICAgIHNyY0RpciA9IHBhdGguZGlybmFtZShtYW5pZmVzdFBhdGgpXG5cbiAgICAgIC8vIENoZWNrIHRoYXQgaW5wdXQgaXMgbWFuaWZlc3QuanNvblxuICAgICAgaWYgKCFtYW5pZmVzdFBhdGguZW5kc1dpdGgobWFuaWZlc3ROYW1lKSkge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFxuICAgICAgICAgIGAke25hbWV9OiBpbnB1dCBpcyBub3QgbWFuaWZlc3QuanNvbmAsXG4gICAgICAgIClcbiAgICAgIH1cblxuICAgICAgLy8gTG9hZCBtYW5pZmVzdC5qc29uXG4gICAgICBjYWNoZS5tYW5pZmVzdCA9IGZzLnJlYWRKU09OU3luYyhtYW5pZmVzdFBhdGgpXG5cbiAgICAgIC8vIERlcml2ZSBlbnRyeSBwYXRocyBmcm9tIG1hbmlmZXN0XG4gICAgICBjb25zdCB7IGFzc2V0UGF0aHMsIGVudHJ5UGF0aHMgfSA9IGRlcml2ZUVudHJpZXMoXG4gICAgICAgIGNhY2hlLm1hbmlmZXN0LFxuICAgICAgICB7XG4gICAgICAgICAgYXNzZXRQYXRoczogYXNzZXRGaWx0ZXIsXG4gICAgICAgICAgZW50cnlQYXRoczogZW50cnlGaWx0ZXIsXG4gICAgICAgICAgdHJhbnNmb3JtOiAobmFtZSkgPT4gcGF0aC5qb2luKHNyY0RpciwgbmFtZSksXG4gICAgICAgICAgZmlsdGVyOiAodikgPT5cbiAgICAgICAgICAgIHR5cGVvZiB2ID09PSAnc3RyaW5nJyAmJlxuICAgICAgICAgICAgaXNWYWxpZFBhdGgodikgJiZcbiAgICAgICAgICAgICEvXmh0dHBzPzovLnRlc3QodiksXG4gICAgICAgIH0sXG4gICAgICApXG5cbiAgICAgIC8vIFN0YXJ0IGFzeW5jIGFzc2V0IGxvYWRpbmdcbiAgICAgIC8vIENPTkNFUk46IHJlbGF0aXZlIHBhdGhzIHdpdGhpbiBDU1MgZmlsZXMgd2lsbCBmYWlsXG4gICAgICAvLyBTT0xVVElPTjogdXNlIHBvc3Rjc3MgdG8gcHJvY2VzcyBDU1MgYXNzZXQgc3JjXG4gICAgICBsb2FkZWRBc3NldHMgPSBQcm9taXNlLmFsbChhc3NldFBhdGhzLm1hcChsb2FkQXNzZXREYXRhKSlcblxuICAgICAgLy8gUmVuZGVyIG9ubHkgbWFuaWZlc3QgZW50cnkganMgZmlsZXNcbiAgICAgIC8vIGFzIGFzeW5jIGlpZmVcbiAgICAgIGNvbnN0IGpzID0gZW50cnlQYXRocy5maWx0ZXIoKHApID0+IC9cXC5qcyQvLnRlc3QocCkpXG4gICAgICBpaWFmZUZpbHRlciA9IGNyZWF0ZUZpbHRlcihcbiAgICAgICAgaWlhZmUuaW5jbHVkZS5jb25jYXQoanMpLFxuICAgICAgICBpaWFmZS5leGNsdWRlLFxuICAgICAgKVxuXG4gICAgICAvLyBDYWNoZSBkZXJpdmVkIGlucHV0c1xuICAgICAgY2FjaGUuaW5wdXQgPSBlbnRyeVBhdGhzXG5cbiAgICAgIHJldHVybiB7IC4uLm9wdGlvbnMsIGlucHV0OiBjYWNoZS5pbnB1dCB9XG4gICAgfSxcblxuICAgIC8qID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09ICovXG4gICAgLyogICAgICAgICAgICAgIEhBTkRMRSBXQVRDSCBGSUxFUyAgICAgICAgICAgICAgKi9cbiAgICAvKiA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PSAqL1xuXG4gICAgYXN5bmMgYnVpbGRTdGFydCgpIHtcbiAgICAgIHRoaXMuYWRkV2F0Y2hGaWxlKG1hbmlmZXN0UGF0aClcbiAgICB9LFxuXG4gICAgd2F0Y2hDaGFuZ2UoaWQpIHtcbiAgICAgIGlmIChpZC5lbmRzV2l0aChtYW5pZmVzdE5hbWUpKSB7XG4gICAgICAgIC8vIER1bXAgY2FjaGUubWFuaWZlc3QgaWYgbWFuaWZlc3QuanNvbiBjaGFuZ2VzXG4gICAgICAgIGNhY2hlLm1hbmlmZXN0ID0gbnVsbFxuICAgICAgfVxuICAgIH0sXG5cbiAgICAvKiA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PSAqL1xuICAgIC8qICAgICAgICAgICAgICAgICAgIFRSQU5TRk9STSAgICAgICAgICAgICAgICAgICovXG4gICAgLyogPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0gKi9cblxuICAgIC8vIHRyYW5zZm9ybShjb2RlLCBpZCkge30sXG5cbiAgICAvKiA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PSAqL1xuICAgIC8qICAgICAgIE1BS0UgTUFOSUZFU1QgRU5UUklFUyBBU1lOQyBJSUZFICAgICAgICovXG4gICAgLyogPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0gKi9cblxuICAgIHJlbmRlckNodW5rKFxuICAgICAgc291cmNlLFxuICAgICAgeyBpc0VudHJ5LCBmYWNhZGVNb2R1bGVJZDogaWQsIGZpbGVOYW1lIH0sXG4gICAgICB7IHNvdXJjZW1hcCB9LFxuICAgICkge1xuICAgICAgaWYgKCFpc0VudHJ5IHx8ICFpaWFmZUZpbHRlcihpZCkpIHJldHVybiBudWxsXG5cbiAgICAgIC8vIHR1cm4gZXMgaW1wb3J0cyB0byBkeW5hbWljIGltcG9ydHNcbiAgICAgIGNvbnN0IGNvZGUgPSBzb3VyY2UucmVwbGFjZShcbiAgICAgICAgL15pbXBvcnQgKC4rKSBmcm9tICgnLis/Jyk7JC9nbSxcbiAgICAgICAgKGxpbmUsICQxLCAkMikgPT4ge1xuICAgICAgICAgIGNvbnN0IGFzZyA9ICQxLnJlcGxhY2UoXG4gICAgICAgICAgICAvKD88PVxcey4rKSggYXMgKSg/PS4rP1xcfSkvZyxcbiAgICAgICAgICAgICc6ICcsXG4gICAgICAgICAgKVxuICAgICAgICAgIHJldHVybiBgY29uc3QgJHthc2d9ID0gYXdhaXQgaW1wb3J0KCR7JDJ9KTtgXG4gICAgICAgIH0sXG4gICAgICApXG5cbiAgICAgIGNvbnN0IG1hZ2ljID0gbmV3IE1hZ2ljU3RyaW5nKGNvZGUpXG5cbiAgICAgIC8vIEFzeW5jIElJRkUtZnlcbiAgICAgIG1hZ2ljXG4gICAgICAgIC5pbmRlbnQoJyAgJylcbiAgICAgICAgLnByZXBlbmQoJyhhc3luYyAoKSA9PiB7XFxuJylcbiAgICAgICAgLmFwcGVuZCgnXFxufSkoKTtcXG4nKVxuXG4gICAgICAvLyBHZW5lcmF0ZSBzb3VyY2VtYXBzXG4gICAgICByZXR1cm4gc291cmNlbWFwXG4gICAgICAgID8ge1xuICAgICAgICAgICAgY29kZTogbWFnaWMudG9TdHJpbmcoKSxcbiAgICAgICAgICAgIG1hcDogbWFnaWMuZ2VuZXJhdGVNYXAoe1xuICAgICAgICAgICAgICBzb3VyY2U6IGZpbGVOYW1lLFxuICAgICAgICAgICAgICBoaXJlczogdHJ1ZSxcbiAgICAgICAgICAgIH0pLFxuICAgICAgICAgIH1cbiAgICAgICAgOiB7IGNvZGU6IG1hZ2ljLnRvU3RyaW5nKCkgfVxuICAgIH0sXG5cbiAgICAvKiA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PSAqL1xuICAgIC8qICAgICAgICAgICAgICAgIEdFTkVSQVRFQlVORExFICAgICAgICAgICAgICAgICovXG4gICAgLyogPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0gKi9cblxuICAgIGFzeW5jIGdlbmVyYXRlQnVuZGxlKG9wdGlvbnMsIGJ1bmRsZSkge1xuICAgICAgLy8gR2V0IG1vZHVsZSBpZHMgZm9yIGFsbCBjaHVua3NcbiAgICAgIGNvbnN0IHBlcm1pc3Npb25zID0gQXJyYXkuZnJvbShcbiAgICAgICAgT2JqZWN0LnZhbHVlcyhidW5kbGUpLnJlZHVjZShcbiAgICAgICAgICAoc2V0LCB7IGNvZGUsIGZhY2FkZU1vZHVsZUlkOiBpZCB9KSA9PiB7XG4gICAgICAgICAgICAvLyBUaGUgb25seSB1c2UgZm9yIHRoaXMgaXMgdG8gZXhjbHVkZSBhIGNodW5rXG4gICAgICAgICAgICBpZiAoaWQgJiYgcGVybWlzc2lvbnNGaWx0ZXIoaWQpKSB7XG4gICAgICAgICAgICAgIHJldHVybiBuZXcgU2V0KFtcbiAgICAgICAgICAgICAgICAuLi5kZXJpdmVQZXJtaXNzaW9ucyhjb2RlKSxcbiAgICAgICAgICAgICAgICAuLi5zZXQsXG4gICAgICAgICAgICAgIF0pXG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICByZXR1cm4gc2V0XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSxcbiAgICAgICAgICBuZXcgU2V0KCksXG4gICAgICAgICksXG4gICAgICApXG5cbiAgICAgIGlmICh2ZXJib3NlKSB7XG4gICAgICAgIC8vIENvbXBhcmUgdG8gbGFzdCBwZXJtaXNzaW9uc1xuICAgICAgICBjb25zdCBwZXJtc0hhc2ggPSBKU09OLnN0cmluZ2lmeShwZXJtaXNzaW9ucylcblxuICAgICAgICBpZiAoIWNhY2hlLnBlcm1zSGFzaCkge1xuICAgICAgICAgIGNvbnNvbGUubG9nKCdEZXJpdmVkIHBlcm1pc3Npb25zOicsIHBlcm1pc3Npb25zKVxuICAgICAgICB9IGVsc2UgaWYgKHBlcm1zSGFzaCAhPT0gY2FjaGUucGVybXNIYXNoKSB7XG4gICAgICAgICAgY29uc29sZS5sb2coJ0Rlcml2ZWQgbmV3IHBlcm1pc3Npb25zOicsIHBlcm1pc3Npb25zKVxuICAgICAgICB9XG5cbiAgICAgICAgY2FjaGUucGVybXNIYXNoID0gcGVybXNIYXNoXG4gICAgICB9XG5cbiAgICAgIC8vIEVtaXQgbG9hZGVkIGFzc2V0cyBhbmRcbiAgICAgIC8vIENyZWF0ZSBhc3NldCBwYXRoIHVwZGF0ZXJzXG4gICAgICBjb25zdCBhc3NldFBhdGhNYXBGbnMgPSBhd2FpdCBnZXRBc3NldFBhdGhNYXBGbnMuY2FsbChcbiAgICAgICAgdGhpcyxcbiAgICAgICAgbG9hZGVkQXNzZXRzLFxuICAgICAgKVxuXG4gICAgICB0cnkge1xuICAgICAgICBjb25zdCBtYW5pZmVzdEJvZHkgPSBkZXJpdmVNYW5pZmVzdChcbiAgICAgICAgICBwa2csXG4gICAgICAgICAgLy8gVXBkYXRlIGFzc2V0IHBhdGhzIGFuZCByZXR1cm4gbWFuaWZlc3RcbiAgICAgICAgICBhc3NldFBhdGhNYXBGbnMucmVkdWNlKFxuICAgICAgICAgICAgbWFwT2JqZWN0VmFsdWVzLFxuICAgICAgICAgICAgY2FjaGUubWFuaWZlc3QsXG4gICAgICAgICAgKSxcbiAgICAgICAgICBwZXJtaXNzaW9ucyxcbiAgICAgICAgKVxuXG4gICAgICAgIC8vIEFkZCByZWxvYWRlciBzY3JpcHRcbiAgICAgICAgaWYgKF91c2VSZWxvYWRlcikge1xuICAgICAgICAgIGlmIChzdGFydFJlbG9hZGVyKSB7XG4gICAgICAgICAgICBhd2FpdCByZWxvYWRlci5zdGFydCgoc2hvdWxkU3RhcnQpID0+IHtcbiAgICAgICAgICAgICAgc3RhcnRSZWxvYWRlciA9IHNob3VsZFN0YXJ0XG4gICAgICAgICAgICB9KVxuXG4gICAgICAgICAgICBjb25zb2xlLmxvZygncmVsb2FkZXIgaXMgcnVubmluZy4uLicpXG4gICAgICAgICAgfVxuXG4gICAgICAgICAgLy8gVE9ETzogcmVsb2FkZXIgc2hvdWxkIGJlIHdyYXBwZWRcbiAgICAgICAgICAvLyAgICAgICBpbiBhIGR5bmFtaWMgaW1wb3J0XG4gICAgICAgICAgLy8gICAgICAgdG8gc3VwcG9ydCBtb2R1bGUgZmVhdHVyZXMuXG4gICAgICAgICAgcmVsb2FkZXIuY3JlYXRlQ2xpZW50RmlsZXMuY2FsbCh0aGlzKVxuXG4gICAgICAgICAgLy8gVE9ETzogaGVyZSwgY2xpZW50IHBhdGggc2hvdWxkIGJlIHRoZSB3cmFwcGVyIGZpbGUuXG4gICAgICAgICAgcmVsb2FkZXIudXBkYXRlTWFuaWZlc3QobWFuaWZlc3RCb2R5KVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHB1YmxpY0tleSkge1xuICAgICAgICAgIG1hbmlmZXN0Qm9keS5rZXkgPSBwdWJsaWNLZXlcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBkZWxldGUgbWFuaWZlc3RCb2R5LmtleVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gTXV0YXRlIGJ1bmRsZSB0byBlbWl0IGN1c3RvbSBhc3NldFxuICAgICAgICBidW5kbGVbbWFuaWZlc3ROYW1lXSA9IHtcbiAgICAgICAgICBmaWxlTmFtZTogbWFuaWZlc3ROYW1lLFxuICAgICAgICAgIGlzQXNzZXQ6IHRydWUsXG4gICAgICAgICAgc291cmNlOiBKU09OLnN0cmluZ2lmeShtYW5pZmVzdEJvZHksIG51bGwsIDIpLFxuICAgICAgICB9XG4gICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICBpZiAoZXJyb3IubmFtZSAhPT0gJ1ZhbGlkYXRpb25FcnJvcicpIHRocm93IGVycm9yXG5cbiAgICAgICAgZXJyb3IuZXJyb3JzLmZvckVhY2goKGVycikgPT4ge1xuICAgICAgICAgIGNvbnNvbGUubG9nKGVycilcbiAgICAgICAgfSlcblxuICAgICAgICB0aGlzLmVycm9yKGVycm9yLm1lc3NhZ2UpXG4gICAgICB9XG4gICAgfSxcblxuICAgIHdyaXRlQnVuZGxlKCkge1xuICAgICAgaWYgKF91c2VSZWxvYWRlciAmJiAhZmlyc3RSdW4pIHtcbiAgICAgICAgcmV0dXJuIHJlbG9hZGVyXG4gICAgICAgICAgLnJlbG9hZCgpXG4gICAgICAgICAgLnRoZW4oKCkgPT4ge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ3JlbG9hZCBzdWNjZXNzLi4uJylcbiAgICAgICAgICB9KVxuICAgICAgICAgIC5jYXRjaCgoZXJyb3IpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IG1lc3NhZ2UgPSBgJHtlcnJvci5tZXNzYWdlfSAoJHtlcnJvci5jb2RlfSlgXG4gICAgICAgICAgICB0aGlzLndhcm4obWVzc2FnZSlcbiAgICAgICAgICB9KVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZmlyc3RSdW4gPSBmYWxzZVxuICAgICAgfVxuICAgIH0sXG4gIH1cbn1cbiIsImltcG9ydCBodG1sSW5wdXRzIGZyb20gJy4vaHRtbC1pbnB1dHMvaW5kZXgnXG5pbXBvcnQgbWFuaWZlc3RJbnB1dCBmcm9tICcuL21hbmlmZXN0LWlucHV0L2luZGV4J1xuXG5leHBvcnQgZGVmYXVsdCBvcHRzID0+IHtcbiAgY29uc3QgbWFuaWZlc3QgPSBtYW5pZmVzdElucHV0KG9wdHMpXG4gIGNvbnN0IGh0bWwgPSBodG1sSW5wdXRzKG9wdHMpXG4gIGNvbnN0IHBsdWdpbnMgPSBbbWFuaWZlc3QsIGh0bWxdXG5cbiAgcmV0dXJuIHtcbiAgICBuYW1lOiAnY2hyb21lLWV4dGVuc2lvbicsXG5cbiAgICBvcHRpb25zKG9wdGlvbnMpIHtcbiAgICAgIHJldHVybiBwbHVnaW5zLnJlZHVjZShcbiAgICAgICAgKG8sIHApID0+IChwLm9wdGlvbnMgPyBwLm9wdGlvbnMuY2FsbCh0aGlzLCBvKSA6IG8pLFxuICAgICAgICBvcHRpb25zLFxuICAgICAgKVxuICAgIH0sXG5cbiAgICBidWlsZFN0YXJ0KG9wdGlvbnMpIHtcbiAgICAgIG1hbmlmZXN0LmJ1aWxkU3RhcnQuY2FsbCh0aGlzLCBvcHRpb25zKVxuICAgICAgaHRtbC5idWlsZFN0YXJ0LmNhbGwodGhpcywgb3B0aW9ucylcbiAgICB9LFxuXG4gICAgd2F0Y2hDaGFuZ2UoaWQpIHtcbiAgICAgIG1hbmlmZXN0LndhdGNoQ2hhbmdlLmNhbGwodGhpcywgaWQpXG4gICAgICBodG1sLndhdGNoQ2hhbmdlLmNhbGwodGhpcywgaWQpXG4gICAgfSxcblxuICAgIHJlbmRlckNodW5rKC4uLmFyZ3MpIHtcbiAgICAgIHJldHVybiBtYW5pZmVzdC5yZW5kZXJDaHVuay5jYWxsKHRoaXMsIC4uLmFyZ3MpXG4gICAgfSxcblxuICAgIGFzeW5jIGdlbmVyYXRlQnVuZGxlKC4uLmFyZ3MpIHtcbiAgICAgIGNvbnN0IGhvb2sgPSAnZ2VuZXJhdGVCdW5kbGUnXG5cbiAgICAgIGF3YWl0IFByb21pc2UuYWxsKFtcbiAgICAgICAgbWFuaWZlc3RbaG9va10uY2FsbCh0aGlzLCAuLi5hcmdzKSxcbiAgICAgICAgaHRtbFtob29rXS5jYWxsKHRoaXMsIC4uLmFyZ3MpLFxuICAgICAgXSlcbiAgICB9LFxuXG4gICAgd3JpdGVCdW5kbGUoKSB7XG4gICAgICBtYW5pZmVzdC53cml0ZUJ1bmRsZS5jYWxsKHRoaXMpXG4gICAgfSxcbiAgfVxufVxuIl0sIm5hbWVzIjpbIm5hbWUiLCJkZXJpdmVQZXJtaXNzaW9ucyIsImRwIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7O0FBS08sTUFBTSxhQUFhLEdBQUcsU0FBUztFQUNwQyxFQUFFLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQyxTQUFTLEVBQUUsR0FBRyxDQUFDLEVBQUM7O0FBRXRELEFBQU8sTUFBTSxTQUFTLEdBQUcsQ0FBQyxFQUFFLEVBQUUsRUFBRSxLQUFLLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDOztBQUVqRSxBQUFPLGVBQWUsa0JBQWtCLENBQUMsTUFBTSxFQUFFO0VBQy9DLE9BQU8sQ0FBQyxNQUFNLE1BQU0sRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDLFNBQVMsRUFBRSxRQUFRLENBQUMsS0FBSztJQUNuRCxNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLFNBQVMsRUFBQztJQUNyQyxNQUFNLEVBQUUsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxRQUFRLEVBQUM7SUFDekMsTUFBTSxhQUFhLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixDQUFDLEVBQUUsRUFBQzs7SUFFL0MsT0FBTyxDQUFDLElBQUk7TUFDVixJQUFJLE9BQU8s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
