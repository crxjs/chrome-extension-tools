import { writeFileSync } from 'node:fs'

// Vitest 0.34's JSON reporter omits unhandled errors outside test assertions.
export default class FirefoxExecutionReporter {
  onFinished(files, errors) {
    writeFileSync(
      'tests/firefox/artifacts/execution.json',
      JSON.stringify(
        {
          fileCount: files.length,
          unhandledErrors: errors.map((error) =>
            String(error.stack || error.message || error),
          ),
        },
        null,
        2,
      ),
    )
  }
}
