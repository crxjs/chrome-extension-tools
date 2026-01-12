#!/usr/bin/env node
/**
 * UTF-8 Validator for Chrome Extensions
 *
 * This script validates files against Chrome's base::IsStringUTF8()
 * implementation. Chrome rejects extension files that contain:
 *
 * - Invalid UTF-8 byte sequences
 * - Surrogate code points (U+D800-U+DFFF)
 * - Non-character code points (U+FFFE, U+FFFF, U+FDD0-U+FDEF, and
 *   U+nFFFE/U+nFFFF)
 *
 * Usage: node validate-utf8.js <directory> node validate-utf8.js <file1>
 * <file2> ... node validate-utf8.js ./dist
 *
 * This is useful for diagnosing "Failed to load extension" errors on Windows
 * with Chinese locale (issue #1083).
 *
 * @see https://github.com/nickcoxdotme/chrome-extension-tools/issues/1083
 * @see https://chromium.googlesource.com/chromium/src/+/main/base/strings/utf_string_conversion_utils.cc
 */

const fs = require('fs')
const path = require('path')

// ANSI colors for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
}

// Disable colors if not a TTY or on Windows without color support
const useColors =
  process.stdout.isTTY &&
  (process.platform !== 'win32' || process.env.FORCE_COLOR)
const c = (color, text) =>
  useColors ? `${colors[color]}${text}${colors.reset}` : text

/**
 * Check if a code point is a Unicode non-character. Chrome's
 * base::IsStringUTF8() rejects these.
 *
 * Non-characters are:
 *
 * - U+FDD0 to U+FDEF (32 code points)
 * - U+FFFE and U+FFFF (and U+nFFFE/U+nFFFF for each plane)
 */
function isNonCharacter(codePoint) {
  // U+FDD0 to U+FDEF
  if (codePoint >= 0xfdd0 && codePoint <= 0xfdef) {
    return true
  }
  // U+FFFE, U+FFFF, and their equivalents in other planes (U+1FFFE, U+1FFFF, etc.)
  if ((codePoint & 0xfffe) === 0xfffe) {
    return true
  }
  return false
}

/**
 * Check if a code point is a surrogate (U+D800-U+DFFF). These should never
 * appear in valid UTF-8.
 */
function isSurrogate(codePoint) {
  return codePoint >= 0xd800 && codePoint <= 0xdfff
}

/**
 * Validate a buffer against Chrome's base::IsStringUTF8() rules. Returns an
 * object with validation results and details about any issues found.
 */
function validateUtf8(buffer) {
  const issues = []
  let i = 0

  while (i < buffer.length) {
    const byte = buffer[i]
    let codePoint
    let byteCount
    let minCodePoint

    if ((byte & 0x80) === 0) {
      // Single byte (ASCII): 0xxxxxxx
      codePoint = byte
      byteCount = 1
      minCodePoint = 0
    } else if ((byte & 0xe0) === 0xc0) {
      // Two bytes: 110xxxxx 10xxxxxx
      byteCount = 2
      minCodePoint = 0x80
      codePoint = byte & 0x1f
    } else if ((byte & 0xf0) === 0xe0) {
      // Three bytes: 1110xxxx 10xxxxxx 10xxxxxx
      byteCount = 3
      minCodePoint = 0x800
      codePoint = byte & 0x0f
    } else if ((byte & 0xf8) === 0xf0) {
      // Four bytes: 11110xxx 10xxxxxx 10xxxxxx 10xxxxxx
      byteCount = 4
      minCodePoint = 0x10000
      codePoint = byte & 0x07
    } else {
      // Invalid leading byte
      issues.push({
        offset: i,
        type: 'invalid_leading_byte',
        bytes: [byte],
        message: `Invalid UTF-8 leading byte 0x${byte
          .toString(16)
          .toUpperCase()
          .padStart(2, '0')}`,
      })
      i++
      continue
    }

    // Check if we have enough bytes
    if (i + byteCount > buffer.length) {
      issues.push({
        offset: i,
        type: 'truncated_sequence',
        bytes: Array.from(buffer.slice(i)),
        message: `Truncated UTF-8 sequence at end of file (expected ${byteCount} bytes, got ${
          buffer.length - i
        })`,
      })
      break
    }

    // Read continuation bytes
    let valid = true
    for (let j = 1; j < byteCount; j++) {
      const contByte = buffer[i + j]
      if ((contByte & 0xc0) !== 0x80) {
        issues.push({
          offset: i,
          type: 'invalid_continuation',
          bytes: Array.from(buffer.slice(i, i + byteCount)),
          message: `Invalid continuation byte 0x${contByte
            .toString(16)
            .toUpperCase()
            .padStart(2, '0')} at offset ${i + j}`,
        })
        valid = false
        break
      }
      codePoint = (codePoint << 6) | (contByte & 0x3f)
    }

    if (!valid) {
      i++
      continue
    }

    // Check for overlong encoding
    if (codePoint < minCodePoint) {
      issues.push({
        offset: i,
        type: 'overlong_encoding',
        bytes: Array.from(buffer.slice(i, i + byteCount)),
        codePoint,
        message: `Overlong encoding for U+${codePoint
          .toString(16)
          .toUpperCase()
          .padStart(
            4,
            '0',
          )} (used ${byteCount} bytes instead of minimum required)`,
      })
      i += byteCount
      continue
    }

    // Check for code point too large
    if (codePoint > 0x10ffff) {
      issues.push({
        offset: i,
        type: 'invalid_codepoint',
        bytes: Array.from(buffer.slice(i, i + byteCount)),
        codePoint,
        message: `Code point U+${codePoint
          .toString(16)
          .toUpperCase()} exceeds Unicode maximum (U+10FFFF)`,
      })
      i += byteCount
      continue
    }

    // Check for surrogate code points (U+D800-U+DFFF)
    if (isSurrogate(codePoint)) {
      issues.push({
        offset: i,
        type: 'surrogate',
        bytes: Array.from(buffer.slice(i, i + byteCount)),
        codePoint,
        message: `Surrogate code point U+${codePoint
          .toString(16)
          .toUpperCase()
          .padStart(4, '0')} is not allowed in UTF-8`,
      })
      i += byteCount
      continue
    }

    // Check for non-character code points (Chrome rejects these!)
    if (isNonCharacter(codePoint)) {
      issues.push({
        offset: i,
        type: 'non_character',
        bytes: Array.from(buffer.slice(i, i + byteCount)),
        codePoint,
        message: `Non-character code point U+${codePoint
          .toString(16)
          .toUpperCase()
          .padStart(4, '0')} (Chrome rejects these)`,
      })
      i += byteCount
      continue
    }

    i += byteCount
  }

  return {
    valid: issues.length === 0,
    issues,
    size: buffer.length,
  }
}

/** Get all files in a directory recursively. */
function getFilesRecursively(dir, extensions = null) {
  const files = []

  function walk(currentDir) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true })
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name)
      if (entry.isDirectory()) {
        // Skip node_modules and hidden directories
        if (entry.name !== 'node_modules' && !entry.name.startsWith('.')) {
          walk(fullPath)
        }
      } else if (entry.isFile()) {
        if (!extensions || extensions.some((ext) => entry.name.endsWith(ext))) {
          files.push(fullPath)
        }
      }
    }
  }

  walk(dir)
  return files
}

/** Format bytes as hex string for display. */
function formatBytes(bytes) {
  return bytes
    .map((b) => b.toString(16).toUpperCase().padStart(2, '0'))
    .join(' ')
}

/** Try to identify what encoding the invalid bytes might be. */
function guessEncoding(bytes) {
  // Check for common GBK/GB2312 patterns (Chinese)
  if (bytes.length >= 2) {
    const [b1, b2] = bytes
    // GBK range: first byte 0x81-0xFE, second byte 0x40-0xFE
    if (b1 >= 0x81 && b1 <= 0xfe && b2 >= 0x40 && b2 <= 0xfe) {
      return 'GBK/GB2312 (Chinese)'
    }
    // Shift-JIS range
    if ((b1 >= 0x81 && b1 <= 0x9f) || (b1 >= 0xe0 && b1 <= 0xfc)) {
      if ((b2 >= 0x40 && b2 <= 0x7e) || (b2 >= 0x80 && b2 <= 0xfc)) {
        return 'Shift-JIS (Japanese)'
      }
    }
  }
  // Check for Latin-1/Windows-1252 high bytes
  if (bytes.some((b) => b >= 0x80 && b <= 0xff)) {
    return 'possibly Latin-1/Windows-1252'
  }
  return 'unknown'
}

/** Print system information for debugging. */
function printSystemInfo() {
  console.log(c('cyan', '\n=== System Information ==='))
  console.log(`Platform: ${process.platform}`)
  console.log(`Node.js: ${process.version}`)
  console.log(`Architecture: ${process.arch}`)

  // Windows-specific info
  if (process.platform === 'win32') {
    console.log(`\n${c('yellow', 'Windows Locale Settings:')}`)
    try {
      const { execSync } = require('child_process')

      // Get active code page
      try {
        const chcp = execSync('chcp', { encoding: 'utf8' }).trim()
        console.log(`Active Code Page: ${chcp}`)
        if (chcp.includes('936')) {
          console.log(
            c('yellow', '  WARNING: Code page 936 (GBK/Chinese) detected!'),
          )
          console.log(
            c('yellow', '  This may cause encoding issues with file I/O.'),
          )
        }
      } catch (e) {
        console.log('Active Code Page: (unable to determine)')
      }

      // Get system locale
      try {
        const locale = execSync('wmic os get locale /value', {
          encoding: 'utf8',
        })
        const match = locale.match(/Locale=(\w+)/)
        if (match) {
          console.log(`System Locale: ${match[1]}`)
        }
      } catch (e) {}
    } catch (e) {
      console.log('(Unable to get Windows locale info)')
    }
  }

  // Environment variables that might affect encoding
  console.log(`\n${c('yellow', 'Encoding Environment Variables:')}`)
  const envVars = ['LANG', 'LC_ALL', 'LC_CTYPE', 'PYTHONIOENCODING', 'CHCP']
  for (const v of envVars) {
    if (process.env[v]) {
      console.log(`${v}: ${process.env[v]}`)
    }
  }
  console.log('')
}

/** Main function. */
function main() {
  const args = process.argv.slice(2)

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log(`
${c('cyan', 'UTF-8 Validator for Chrome Extensions')}
${c('dim', "Validates files against Chrome's base::IsStringUTF8() rules")}

${c('yellow', 'Usage:')}
  node validate-utf8.js <directory>
  node validate-utf8.js <file1> <file2> ...
  node validate-utf8.js ./dist --extensions .js,.css,.html

${c('yellow', 'Options:')}
  --extensions <exts>  Comma-separated list of extensions to check (default: .js,.css,.html,.json)
  --all                Check all files regardless of extension
  --verbose            Show details for valid files too
  --system-info        Show system/locale information
  --help               Show this help

${c('yellow', 'Examples:')}
  node validate-utf8.js ./dist
  node validate-utf8.js ./dist --extensions .js,.css
  node validate-utf8.js manifest.json background.js content.js

${c('yellow', 'About:')}
  Chrome validates all extension files using base::IsStringUTF8() which rejects:
  - Invalid UTF-8 byte sequences
  - Surrogate code points (U+D800-U+DFFF)  
  - Non-character code points (U+FFFE, U+FFFF, U+FDD0-U+FDEF, etc.)

  This is commonly an issue on Windows with Chinese locale (code page 936/GBK)
  where file I/O may use the system encoding instead of UTF-8.

  Issue: https://github.com/nickcoxdotme/chrome-extension-tools/issues/1083
`)
    process.exit(0)
  }

  // Parse options
  let showSystemInfo = args.includes('--system-info')
  let verbose = args.includes('--verbose')
  let checkAll = args.includes('--all')
  let extensions = ['.js', '.css', '.html', '.json', '.mjs', '.cjs']

  const extIndex = args.indexOf('--extensions')
  if (extIndex !== -1 && args[extIndex + 1]) {
    extensions = args[extIndex + 1]
      .split(',')
      .map((e) => (e.startsWith('.') ? e : '.' + e))
  }

  // Filter out option arguments
  const paths = args.filter(
    (a) =>
      !a.startsWith('--') &&
      (args.indexOf('--extensions') === -1 ||
        args.indexOf(a) !== args.indexOf('--extensions') + 1),
  )

  if (showSystemInfo) {
    printSystemInfo()
  }

  // Collect files to check
  let files = []
  for (const p of paths) {
    if (!fs.existsSync(p)) {
      console.error(c('red', `Error: Path does not exist: ${p}`))
      process.exit(1)
    }

    const stat = fs.statSync(p)
    if (stat.isDirectory()) {
      files.push(...getFilesRecursively(p, checkAll ? null : extensions))
    } else {
      files.push(p)
    }
  }

  if (files.length === 0) {
    console.log(c('yellow', 'No files found to validate.'))
    console.log(`Searched for: ${extensions.join(', ')}`)
    console.log('Use --all to check all files regardless of extension.')
    process.exit(0)
  }

  console.log(c('cyan', `\nValidating ${files.length} file(s)...\n`))

  let validCount = 0
  let invalidCount = 0
  const invalidFiles = []

  for (const file of files) {
    try {
      const buffer = fs.readFileSync(file)
      const result = validateUtf8(buffer)

      const relativePath = path.relative(process.cwd(), file)

      if (result.valid) {
        validCount++
        if (verbose) {
          console.log(
            `${c('green', 'PASS')} ${relativePath} ${c(
              'dim',
              `(${result.size} bytes)`,
            )}`,
          )
        }
      } else {
        invalidCount++
        invalidFiles.push({ file: relativePath, result })
        console.log(
          `${c('red', 'FAIL')} ${relativePath} ${c(
            'dim',
            `(${result.size} bytes)`,
          )}`,
        )

        // Show first few issues
        const maxIssues = 5
        for (let i = 0; i < Math.min(result.issues.length, maxIssues); i++) {
          const issue = result.issues[i]
          console.log(`     ${c('yellow', 'Issue:')} ${issue.message}`)
          console.log(
            `     ${c('dim', 'Offset:')} ${
              issue.offset
            } (0x${issue.offset.toString(16)})`,
          )
          console.log(`     ${c('dim', 'Bytes:')} ${formatBytes(issue.bytes)}`)

          if (
            issue.type === 'invalid_leading_byte' ||
            issue.type === 'invalid_continuation'
          ) {
            const guess = guessEncoding(issue.bytes)
            console.log(`     ${c('dim', 'Possible encoding:')} ${guess}`)
          }
        }

        if (result.issues.length > maxIssues) {
          console.log(
            `     ${c(
              'dim',
              `... and ${result.issues.length - maxIssues} more issues`,
            )}`,
          )
        }
        console.log('')
      }
    } catch (err) {
      console.error(`${c('red', 'ERROR')} ${file}: ${err.message}`)
      invalidCount++
    }
  }

  // Summary
  console.log(c('cyan', '\n=== Summary ==='))
  console.log(`Total files checked: ${files.length}`)
  console.log(`${c('green', 'Valid:')} ${validCount}`)
  console.log(`${c('red', 'Invalid:')} ${invalidCount}`)

  if (invalidCount > 0) {
    console.log(
      c('red', '\nChrome will reject this extension due to invalid UTF-8!'),
    )
    console.log(c('yellow', '\nPossible causes:'))
    console.log(
      '  1. Windows system locale is set to Chinese (code page 936/GBK)',
    )
    console.log('  2. Source files contain non-UTF-8 encoded text')
    console.log(
      '  3. Build tools wrote files using system encoding instead of UTF-8',
    )
    console.log(c('yellow', '\nPossible fixes:'))
    console.log('  1. Ensure all source files are saved as UTF-8')
    console.log('  2. Set CHCP 65001 before running build commands')
    console.log(
      '  3. Set environment variable: set NODE_OPTIONS=--input-type=module',
    )
    process.exit(1)
  } else {
    console.log(
      c(
        'green',
        '\nAll files are valid UTF-8. Chrome should accept this extension.',
      ),
    )
    process.exit(0)
  }
}

// Run if executed directly
if (require.main === module) {
  main()
}

// Export for testing
module.exports = { validateUtf8, isNonCharacter, isSurrogate }
