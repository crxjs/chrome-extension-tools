# UTF-8 Validation Tools

Tools for diagnosing Chrome extension loading failures related to UTF-8 encoding
issues, particularly on Windows systems with Chinese locale (code page 936/GBK).

See
[Issue #1083](https://github.com/nickcoxdotme/chrome-extension-tools/issues/1083)
for context.

## Background

Chrome validates all extension files using `base::IsStringUTF8()` which rejects:

- Invalid UTF-8 byte sequences
- Surrogate code points (U+D800-U+DFFF)
- Non-character code points (U+FFFE, U+FFFF, U+FDD0-U+FDEF, etc.)

On Windows with Chinese locale, file I/O may use GBK encoding instead of UTF-8,
causing extensions to fail loading with "Failed to load extension" errors.

## Quick Start (Node.js)

The easiest way to validate your extension files:

```bash
# Validate your dist folder
node validate-utf8.js ./dist

# Show system locale info (useful on Windows)
node validate-utf8.js ./dist --system-info

# Validate specific files
node validate-utf8.js manifest.json background.js content.js

# Check all files (not just .js/.css/.html/.json)
node validate-utf8.js ./dist --all
```

### Example Output

```
=== System Information ===
Platform: win32
Node.js: v18.17.0
Active Code Page: 936
  WARNING: Code page 936 (GBK/Chinese) detected!

Validating 5 file(s)...

PASS dist/manifest.json (234 bytes)
FAIL dist/background.js (1523 bytes)
     Issue: Invalid continuation byte 0xE3 at offset 14
     Offset: 13 (0xd)
     Bytes: C4 E3
     Possible encoding: GBK/GB2312 (Chinese)

=== Summary ===
Total files checked: 5
Valid: 4
Invalid: 1

Chrome will reject this extension due to invalid UTF-8!
```

## Files

| File                    | Description                                                    |
| ----------------------- | -------------------------------------------------------------- |
| `validate-utf8.js`      | **Node.js validator** - Single-file, portable, no dependencies |
| `test_utf8.cpp`         | C++ validator matching Chrome's exact implementation           |
| `create_test_files.cpp` | Generates test files with various encoding issues              |
| `validate_utf8.sh`      | Shell wrapper for the C++ validator                            |
| `test_*.js`             | Sample files with valid/invalid UTF-8 for testing              |

## For Contributors Experiencing the Issue

If you're hitting the "Failed to load extension" error on Windows with Chinese
locale:

1. Download `validate-utf8.js` from this folder
2. Build your extension normally
3. Run: `node validate-utf8.js ./dist --system-info`
4. Share the output in the issue

This helps us understand exactly what's getting corrupted during the build.

## Technical Details

Chrome's validation is implemented in:

- `extensions/common/utils/content_script_utils.cc` (line 139)
- Uses `base::IsStringUTF8()` from `base/strings/utf_string_conversion_utils.cc`

The validation rejects not just malformed UTF-8, but also:

- **Surrogates** (U+D800-U+DFFF): Reserved for UTF-16, never valid in UTF-8
- **Non-characters** (U+FFFE, U+FFFF, U+FDD0-U+FDEF): Permanently reserved by
  Unicode
- **Overlong encodings**: Using more bytes than necessary for a code point
