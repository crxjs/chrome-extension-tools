// UTF-8 validation test - simulates Chrome's base::IsStringUTF8()
// Based on Chromium source: base/strings/string_util.cc
//
// This helps reproduce issue #1083:
// https://github.com/crxjs/chrome-extension-tools/issues/1083

#include <cstdint>
#include <cstdio>
#include <cstring>
#include <string>
#include <vector>
#include <fstream>
#include <iostream>
#include <sstream>

// Unicode constants
constexpr uint32_t kMaxCodepoint = 0x10FFFF;
constexpr uint32_t kSurrogateStart = 0xD800;
constexpr uint32_t kSurrogateEnd = 0xDFFF;

// Check if a codepoint is a valid Unicode character
// Chrome's IsValidCharacter rejects non-character code points
bool IsValidCharacter(uint32_t codepoint) {
    // Reject surrogates
    if (codepoint >= kSurrogateStart && codepoint <= kSurrogateEnd)
        return false;
    
    // Reject values beyond max Unicode
    if (codepoint > kMaxCodepoint)
        return false;
    
    // Reject non-character code points (U+FFFE, U+FFFF, U+nFFFE, U+nFFFF)
    // These are valid UTF-8 but Chrome's IsStringUTF8 rejects them
    if ((codepoint & 0xFFFE) == 0xFFFE)
        return false;
    
    // Reject non-characters in range U+FDD0 to U+FDEF
    if (codepoint >= 0xFDD0 && codepoint <= 0xFDEF)
        return false;
    
    return true;
}

// Decode a UTF-8 sequence and validate it
// Returns the number of bytes consumed, or 0 on error
// Sets codepoint to the decoded value
int DecodeUTF8(const uint8_t* bytes, size_t len, uint32_t* codepoint) {
    if (len == 0) return 0;
    
    uint8_t b0 = bytes[0];
    
    // ASCII (0x00-0x7F)
    if (b0 <= 0x7F) {
        *codepoint = b0;
        return 1;
    }
    
    // Determine sequence length and initial bits
    int seq_len;
    uint32_t min_codepoint;
    uint32_t cp;
    
    if ((b0 & 0xE0) == 0xC0) {
        // 2-byte sequence: 110xxxxx 10xxxxxx
        seq_len = 2;
        min_codepoint = 0x80;
        cp = b0 & 0x1F;
    } else if ((b0 & 0xF0) == 0xE0) {
        // 3-byte sequence: 1110xxxx 10xxxxxx 10xxxxxx
        seq_len = 3;
        min_codepoint = 0x800;
        cp = b0 & 0x0F;
    } else if ((b0 & 0xF8) == 0xF0) {
        // 4-byte sequence: 11110xxx 10xxxxxx 10xxxxxx 10xxxxxx
        seq_len = 4;
        min_codepoint = 0x10000;
        cp = b0 & 0x07;
    } else {
        // Invalid leading byte (10xxxxxx continuation or 11111xxx)
        return 0;
    }
    
    // Check we have enough bytes
    if ((size_t)seq_len > len) return 0;
    
    // Validate continuation bytes and build codepoint
    for (int i = 1; i < seq_len; i++) {
        uint8_t b = bytes[i];
        if ((b & 0xC0) != 0x80) {
            // Not a valid continuation byte
            return 0;
        }
        cp = (cp << 6) | (b & 0x3F);
    }
    
    // Reject overlong encodings
    if (cp < min_codepoint) return 0;
    
    *codepoint = cp;
    return seq_len;
}

// Simulates Chrome's base::IsStringUTF8()
// Returns true if the string is valid UTF-8 with no non-characters
bool IsStringUTF8(const std::string& str) {
    const uint8_t* bytes = reinterpret_cast<const uint8_t*>(str.data());
    size_t len = str.size();
    size_t i = 0;
    
    while (i < len) {
        uint32_t codepoint;
        int consumed = DecodeUTF8(bytes + i, len - i, &codepoint);
        
        if (consumed == 0) {
            // Invalid UTF-8 sequence
            return false;
        }
        
        if (!IsValidCharacter(codepoint)) {
            // Valid UTF-8 but non-character code point
            return false;
        }
        
        i += consumed;
    }
    
    return true;
}

// Detailed validation with error reporting
struct ValidationResult {
    bool valid;
    size_t error_position;
    std::string error_message;
    uint32_t bad_codepoint;
};

ValidationResult ValidateUTF8Detailed(const std::string& str) {
    ValidationResult result = {true, 0, "", 0};
    
    const uint8_t* bytes = reinterpret_cast<const uint8_t*>(str.data());
    size_t len = str.size();
    size_t i = 0;
    
    while (i < len) {
        uint32_t codepoint;
        int consumed = DecodeUTF8(bytes + i, len - i, &codepoint);
        
        if (consumed == 0) {
            result.valid = false;
            result.error_position = i;
            
            uint8_t b = bytes[i];
            char msg[256];
            if ((b & 0xC0) == 0x80) {
                snprintf(msg, sizeof(msg), "Unexpected continuation byte 0x%02X", b);
            } else if (b >= 0xF8) {
                snprintf(msg, sizeof(msg), "Invalid leading byte 0x%02X (5+ byte sequence not allowed)", b);
            } else {
                snprintf(msg, sizeof(msg), "Invalid or truncated UTF-8 sequence starting with 0x%02X", b);
            }
            result.error_message = msg;
            return result;
        }
        
        if (!IsValidCharacter(codepoint)) {
            result.valid = false;
            result.error_position = i;
            result.bad_codepoint = codepoint;
            
            char msg[256];
            if (codepoint >= kSurrogateStart && codepoint <= kSurrogateEnd) {
                snprintf(msg, sizeof(msg), "Surrogate code point U+%04X not allowed in UTF-8", codepoint);
            } else if ((codepoint & 0xFFFE) == 0xFFFE) {
                snprintf(msg, sizeof(msg), "Non-character code point U+%04X rejected by Chrome", codepoint);
            } else if (codepoint >= 0xFDD0 && codepoint <= 0xFDEF) {
                snprintf(msg, sizeof(msg), "Non-character code point U+%04X (in U+FDD0..U+FDEF range)", codepoint);
            } else {
                snprintf(msg, sizeof(msg), "Invalid code point U+%04X", codepoint);
            }
            result.error_message = msg;
            return result;
        }
        
        i += consumed;
    }
    
    return result;
}

// Print hex dump of bytes
void PrintHexDump(const uint8_t* bytes, size_t len, size_t highlight_pos = SIZE_MAX) {
    for (size_t i = 0; i < len && i < 64; i++) {
        if (i == highlight_pos) {
            printf("[%02X]", bytes[i]);
        } else {
            printf(" %02X ", bytes[i]);
        }
    }
    if (len > 64) printf(" ...");
    printf("\n");
}

// Test cases
void RunTests() {
    printf("=== Chrome base::IsStringUTF8() Simulation Tests ===\n\n");
    
    struct TestCase {
        std::string name;
        std::vector<uint8_t> bytes;
        bool expected_valid;
    };
    
    std::vector<TestCase> tests = {
        // Valid cases
        {"ASCII only", {'H', 'e', 'l', 'l', 'o'}, true},
        {"UTF-8 Chinese (你好)", {0xE4, 0xBD, 0xA0, 0xE5, 0xA5, 0xBD}, true},
        {"UTF-8 Emoji (😀 U+1F600)", {0xF0, 0x9F, 0x98, 0x80}, true},
        {"UTF-8 Stopwatch (⏱️ U+23F1)", {0xE2, 0x8F, 0xB1}, true},
        
        // Invalid UTF-8 sequences
        {"Lone continuation byte", {0x80}, false},
        {"Invalid leading byte 0xFF", {0xFF}, false},
        {"Invalid leading byte 0xFE", {0xFE}, false},
        {"Truncated 2-byte", {0xC2}, false},
        {"Truncated 3-byte", {0xE4, 0xBD}, false},
        {"Truncated 4-byte", {0xF0, 0x9F, 0x98}, false},
        {"Overlong 2-byte for ASCII", {0xC0, 0x80}, false},  // Should be 0x00
        {"Overlong 3-byte for ASCII", {0xE0, 0x80, 0x80}, false},
        
        // Surrogate pairs (invalid in UTF-8)
        {"Surrogate U+D800", {0xED, 0xA0, 0x80}, false},
        {"Surrogate U+DFFF", {0xED, 0xBF, 0xBF}, false},
        
        // Non-character code points (Chrome rejects these!)
        {"Non-char U+FFFE", {0xEF, 0xBF, 0xBE}, false},
        {"Non-char U+FFFF", {0xEF, 0xBF, 0xBF}, false},
        {"Non-char U+1FFFE", {0xF0, 0x9F, 0xBF, 0xBE}, false},
        {"Non-char U+10FFFF", {0xF4, 0x8F, 0xBF, 0xBF}, false},
        {"Non-char U+FDD0", {0xEF, 0xB7, 0x90}, false},
        {"Non-char U+FDEF", {0xEF, 0xB7, 0xAF}, false},
        
        // GBK/GB2312 encoded Chinese (NOT valid UTF-8)
        // "你好" in GBK is: C4 E3 BA C3
        {"GBK Chinese (你好) - NOT UTF-8", {0xC4, 0xE3, 0xBA, 0xC3}, false},
        
        // Mixed valid and invalid
        {"Valid then GBK", {'H', 'i', 0xC4, 0xE3}, false},
        
        // What happens when UTF-8 is read as GBK then written back
        // This simulates the Windows Chinese locale issue
        {"Corrupted UTF-8 (simulated GBK misread)", {0x80, 0x81, 0x82}, false},
    };
    
    int passed = 0;
    int failed = 0;
    
    for (const auto& test : tests) {
        std::string str(test.bytes.begin(), test.bytes.end());
        bool result = IsStringUTF8(str);
        
        bool test_passed = (result == test.expected_valid);
        
        printf("%s: %s\n", test_passed ? "PASS" : "FAIL", test.name.c_str());
        printf("  Bytes: ");
        PrintHexDump(test.bytes.data(), test.bytes.size());
        printf("  Expected: %s, Got: %s\n", 
               test.expected_valid ? "valid" : "invalid",
               result ? "valid" : "invalid");
        
        if (!result) {
            ValidationResult detail = ValidateUTF8Detailed(str);
            printf("  Error at byte %zu: %s\n", detail.error_position, detail.error_message.c_str());
        }
        printf("\n");
        
        if (test_passed) passed++;
        else failed++;
    }
    
    printf("=== Results: %d passed, %d failed ===\n\n", passed, failed);
}

// Validate a file
void ValidateFile(const char* filename) {
    std::ifstream file(filename, std::ios::binary);
    if (!file) {
        printf("Error: Cannot open file '%s'\n", filename);
        return;
    }
    
    std::stringstream buffer;
    buffer << file.rdbuf();
    std::string content = buffer.str();
    
    printf("=== Validating file: %s ===\n", filename);
    printf("File size: %zu bytes\n", content.size());
    
    ValidationResult result = ValidateUTF8Detailed(content);
    
    if (result.valid) {
        printf("Result: VALID UTF-8\n");
        printf("Chrome's base::IsStringUTF8() would return: TRUE\n");
    } else {
        printf("Result: INVALID\n");
        printf("Chrome's base::IsStringUTF8() would return: FALSE\n");
        printf("Error at byte %zu: %s\n", result.error_position, result.error_message.c_str());
        
        // Show context around error
        const uint8_t* bytes = reinterpret_cast<const uint8_t*>(content.data());
        size_t start = result.error_position > 16 ? result.error_position - 16 : 0;
        size_t end = std::min(result.error_position + 16, content.size());
        
        printf("Context (bytes %zu-%zu):\n  ", start, end);
        for (size_t i = start; i < end; i++) {
            if (i == result.error_position) {
                printf("[%02X]", bytes[i]);
            } else {
                printf(" %02X ", bytes[i]);
            }
        }
        printf("\n");
    }
    printf("\n");
}

int main(int argc, char* argv[]) {
    if (argc == 1) {
        // Run built-in tests
        RunTests();
        
        printf("Usage: %s [file1] [file2] ...\n", argv[0]);
        printf("Pass JavaScript files to validate them against Chrome's UTF-8 requirements.\n");
    } else {
        // Validate provided files
        for (int i = 1; i < argc; i++) {
            ValidateFile(argv[i]);
        }
    }
    
    return 0;
}
