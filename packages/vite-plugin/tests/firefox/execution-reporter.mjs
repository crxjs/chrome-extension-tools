import { writeFileSync } from 'node:fs'

// Persist unhandled errors separately for execution completeness verification.
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
