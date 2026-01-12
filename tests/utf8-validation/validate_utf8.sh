#!/bin/bash
# UTF-8 Validation Script for Chrome Extension Files
# Validates files against Chrome's base::IsStringUTF8() requirements
#
# Usage: ./validate_utf8.sh <file1> [file2] ...
# Exit code: 0 if all valid, 1 if any invalid

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VALIDATOR="$SCRIPT_DIR/test_utf8"

# Build validator if needed
if [ ! -f "$VALIDATOR" ]; then
    echo "Building UTF-8 validator..."
    cd "$SCRIPT_DIR"
    g++ -std=c++17 -O2 -o test_utf8 test_utf8.cpp
fi

if [ $# -eq 0 ]; then
    echo "Usage: $0 <file1> [file2] ..."
    echo "Validates files against Chrome's UTF-8 requirements"
    exit 1
fi

# Run validator and capture output
"$VALIDATOR" "$@"
