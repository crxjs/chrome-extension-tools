#!/usr/bin/env node
import { performance } from 'node:perf_hooks'
import {
  debounceTime,
  filter,
  firstValueFrom,
  map,
  mergeMap,
  of,
  ReplaySubject,
  share,
  startWith,
  Subject,
  switchMap,
  tap,
} from 'rxjs'

const presets = {
  quick: {
    files: 220,
    subscribers: 4,
    fileDelayMs: 10,
    emitIntervalMs: 0,
    debounceMs: 100,
    depsPerFile: 3,
  },
  'startup-lag': {
    files: 375,
    subscribers: 4,
    fileDelayMs: 10,
    emitIntervalMs: 0,
    debounceMs: 100,
    depsPerFile: 3,
  },
}

function printHelp() {
  console.log(`Usage:
  node scripts/bench-ready-recompute.mjs --mode=<old|old-recursive|fixed> [options]

Presets:
  --preset=quick        Multi-second recursive readiness storm.
  --preset=startup-lag  30s-class recursive readiness storm.

Options:
  --files=<n>
  --subscribers=<n>
  --file-delay-ms=<n>
  --emit-interval-ms=<n>
  --debounce-ms=<n>
  --deps-per-file=<n>

Hyperfine startup-lag comparison:
  hyperfine --runs 3 \\
    'node scripts/bench-ready-recompute.mjs --preset=startup-lag --mode=old-recursive' \\
    'node scripts/bench-ready-recompute.mjs --preset=startup-lag --mode=fixed'
`)
}

function parseArgs() {
  const args = new Map()
  for (const arg of process.argv.slice(2)) {
    const [key, value = 'true'] = arg.replace(/^--/, '').split('=')
    args.set(key, value)
  }

  if (args.has('help') || args.has('h')) {
    printHelp()
    process.exit(0)
  }

  const preset = args.get('preset')
  const presetOptions = typeof preset === 'undefined' ? {} : presets[preset]
  if (typeof preset !== 'undefined' && typeof presetOptions === 'undefined') {
    throw new Error(
      `Unknown preset: ${preset}. Expected one of: ${Object.keys(presets).join(
        ', ',
      )}`,
    )
  }

  return {
    preset: preset ?? 'custom',
    mode: args.get('mode') ?? 'old',
    files: Number(args.get('files') ?? presetOptions.files ?? 803),
    subscribers: Number(
      args.get('subscribers') ?? presetOptions.subscribers ?? 4,
    ),
    fileDelayMs: Number(
      args.get('file-delay-ms') ?? presetOptions.fileDelayMs ?? 20,
    ),
    emitIntervalMs: Number(
      args.get('emit-interval-ms') ?? presetOptions.emitIntervalMs ?? 0,
    ),
    debounceMs: Number(
      args.get('debounce-ms') ?? presetOptions.debounceMs ?? 100,
    ),
    depsPerFile: Number(
      args.get('deps-per-file') ?? presetOptions.depsPerFile ?? 0,
    ),
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

class OutputFilesMap extends Map {
  change$ = new Subject()

  set(key, value) {
    const result = super.set(key, value)
    this.change$.next({ type: 'set', key })
    return result
  }
}

async function createFiles(outputFiles, options, metrics) {
  for (let i = 0; i < options.files; i += 1) {
    const deps = []
    for (let depOffset = 1; depOffset <= options.depsPerFile; depOffset += 1) {
      const dep = outputFiles.get(`file-${i - depOffset}`)
      if (dep) deps.push(dep)
    }

    const file = {
      fileName: `file-${i}`,
      file: sleep(options.fileDelayMs).then(() => ({ deps })),
    }

    outputFiles.set(file.fileName, file)
    metrics.filesCreated += 1

    if (options.emitIntervalMs > 0) await sleep(options.emitIntervalMs)
  }
}

function createOldReadyStream({ buildEnd$, outputFiles, metrics }) {
  return buildEnd$.pipe(
    switchMap(() => outputFiles.change$.pipe(startWith({ type: 'start' }))),
    map(() => [...outputFiles.values()]),
    switchMap(async (files) => {
      metrics.generations += 1
      metrics.fileChecks += files.length
      return Promise.allSettled(files.map(({ file }) => file))
    }),
  )
}

function createOldRecursiveReadyStream({ buildEnd$, outputFiles, metrics }) {
  return buildEnd$.pipe(
    switchMap(() => outputFiles.change$.pipe(startWith({ type: 'start' }))),
    map(() => [...outputFiles.values()]),
    switchMap(async (files) => {
      metrics.generations += 1
      metrics.fileChecks += files.length
      return Promise.allSettled(
        files.map((file) => waitForOutputFile(file, metrics)),
      )
    }),
  )
}

function createFixedReadyStream({ buildEnd$, outputFiles, metrics, options }) {
  let currentGeneration = 0
  let completedGeneration = 0
  let lastResults

  const state$ = buildEnd$.pipe(
    switchMap(() =>
      outputFiles.change$.pipe(
        startWith({ type: 'start' }),
        debounceTime(options.debounceMs),
      ),
    ),
    map(() => ({
      generation: ++currentGeneration,
      files: [...outputFiles.values()],
    })),
    switchMap(async ({ generation, files }) => {
      metrics.generations += 1
      metrics.fileChecks += files.length
      const seen = new Set()
      const results = await Promise.allSettled(
        files.map((file) => waitForOutputFile(file, metrics, seen)),
      )
      return { generation, results }
    }),
    tap(({ generation, results }) => {
      completedGeneration = generation
      lastResults = results
    }),
    share(),
  )

  return {
    allFilesReady$: state$.pipe(map(({ results }) => results)),
    async allFilesReady() {
      const targetGeneration = currentGeneration
      if (lastResults && completedGeneration >= targetGeneration) {
        return lastResults
      }
      const { results } = await firstValueFrom(
        state$.pipe(filter(({ generation }) => generation >= targetGeneration)),
      )
      return results
    },
  }
}

async function waitForOutputFile(file, metrics, seen = new Set()) {
  if (seen.has(file)) return
  seen.add(file)
  metrics.fileChecks += 1
  const { deps } = await file.file
  await Promise.all(deps.map((dep) => waitForOutputFile(dep, metrics, seen)))
}

async function run() {
  const options = parseArgs()
  if (!['old', 'old-recursive', 'fixed'].includes(options.mode)) {
    throw new Error(`Unknown mode: ${options.mode}`)
  }

  const outputFiles = new OutputFilesMap()
  const buildEnd$ = new ReplaySubject(1)
  const metrics = {
    mode: options.mode,
    filesCreated: 0,
    generations: 0,
    fileChecks: 0,
    subscribers: options.subscribers,
  }

  const ready =
    options.mode === 'old'
      ? {
          allFilesReady$: createOldReadyStream({
            buildEnd$,
            outputFiles,
            metrics,
          }),
        }
      : options.mode === 'old-recursive'
      ? {
          allFilesReady$: createOldRecursiveReadyStream({
            buildEnd$,
            outputFiles,
            metrics,
          }),
        }
      : createFixedReadyStream({ buildEnd$, outputFiles, metrics, options })

  const start = performance.now()

  const subscriptions = []
  const subscriberPromises = []
  for (let i = 0; i < options.subscribers - 1; i += 1) {
    subscriberPromises.push(firstValueFrom(ready.allFilesReady$))
  }

  // Match the plugin's long-lived timestamp/error subscribers.
  subscriptions.push(
    ready.allFilesReady$
      .pipe(mergeMap((results) => of(results.length)))
      .subscribe(),
  )

  buildEnd$.next({ type: 'build_end' })

  const createPromise = createFiles(outputFiles, options, metrics)
  const explicitReadyPromise =
    options.mode === 'fixed'
      ? ready.allFilesReady()
      : firstValueFrom(ready.allFilesReady$)

  await createPromise
  await Promise.all([...subscriberPromises, explicitReadyPromise])

  const elapsedMs = performance.now() - start
  for (const subscription of subscriptions) subscription.unsubscribe()

  const result = {
    ...metrics,
    preset: options.preset,
    elapsedMs: Math.round(elapsedMs),
    files: options.files,
    depsPerFile: options.depsPerFile,
    fileDelayMs: options.fileDelayMs,
    emitIntervalMs: options.emitIntervalMs,
    debounceMs: options.mode === 'fixed' ? options.debounceMs : 0,
  }
  console.log(JSON.stringify(result))
}

run().catch((error) => {
  console.error(error)
  process.exit(1)
})
