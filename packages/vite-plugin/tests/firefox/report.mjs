import {
  readFileSync,
  writeFileSync,
  appendFileSync,
  readdirSync,
  realpathSync,
} from 'node:fs'
import path from 'node:path'

const report = JSON.parse(
  readFileSync('tests/firefox/artifacts/full-suite.json', 'utf8'),
)
const execution = JSON.parse(
  readFileSync('tests/firefox/artifacts/execution.json', 'utf8'),
)
const run = JSON.parse(
  readFileSync('tests/firefox/artifacts/run-status.json', 'utf8'),
)
const results = report.testResults.flatMap((file) =>
  file.assertionResults.map((test) => ({
    file: path.relative(process.cwd(), file.name).replaceAll('\\', '/'),
    name: test.fullName,
    status: test.status,
    error: test.failureMessages.join('\n'),
  })),
)
function testFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (
        [
          'node_modules',
          '.vite',
          '.vite-build',
          'dist-build',
          'dist-serve',
          'src',
        ].includes(entry.name)
      )
        return []
      return testFiles(file)
    }
    return /\.(test|spec)\.[cm]?[jt]sx?$/.test(entry.name)
      ? [realpathSync(file)]
      : []
  })
}
const expectedFiles = testFiles('tests/e2e')
const reportedFiles = new Set(
  report.testResults.map((file) => realpathSync(file.name)),
)
const missing = expectedFiles.filter((file) => !reportedFiles.has(file))
const empty = report.testResults.filter((file) => !file.assertionResults.length)
const escaped = (value) =>
  String(value).replaceAll('|', '\\|').replaceAll(/\r?\n/g, ' ')
const lines = [
  '# Firefox: complete shared E2E suite',
  '',
  `Passed: ${results.filter((t) => t.status === 'passed').length}; failed: ${
    results.filter((t) => t.status === 'failed').length
  }; skipped/pending: ${
    results.filter((t) => !['passed', 'failed'].includes(t.status)).length
  }.`,
  '',
  'Failures are observations, not an expected-failure allowlist. Existing skips are preserved; three Chrome-only Favicon API checks are explicitly skipped in Firefox.',
  'The Vue production and development pages use reviewed Firefox references; other screenshots use the existing reference images. A visual mismatch alone is not proof of broken functionality.',
  '',
  '| Status | File | Test |',
  '| --- | --- | --- |',
  ...results.map(
    (t) => `| ${t.status} | ${escaped(t.file)} | ${escaped(t.name)} |`,
  ),
  '',
  '## Failure details',
  '',
  ...results
    .filter((t) => t.status === 'failed')
    .flatMap((t) => [
      `### ${t.file}: ${t.name}`,
      '',
      '```text',
      t.error
        .replaceAll(process.cwd(), '<package>')
        .replaceAll(/\u001b\[[0-9;]*m/g, ''),
      '```',
      '',
    ]),
]
const markdown = lines.join('\n')
writeFileSync('tests/firefox/artifacts/full-suite.md', markdown)
if (process.env.GITHUB_STEP_SUMMARY)
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, markdown)
console.log(lines.slice(0, 4).join('\n'))
if (
  results.some((test) => test.error.includes('Firefox setup failed:')) ||
  execution.fileCount !== expectedFiles.length ||
  execution.unhandledErrors.length ||
  ![0, 1].includes(run.status) ||
  run.signal ||
  run.error ||
  missing.length ||
  empty.length ||
  !results.length
) {
  console.error('Firefox execution verification failed', {
    setupFailures: results
      .filter((test) => test.error.includes('Firefox setup failed:'))
      .map((test) => test.file),
    missing,
    empty: empty.map((f) => f.name),
    execution,
    run,
  })
  process.exitCode = 1
}
