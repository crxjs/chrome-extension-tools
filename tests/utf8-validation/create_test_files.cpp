// Simulates the GBK/Chinese locale encoding issue
// This creates test files that demonstrate what happens when:
// 1. A UTF-8 file with Chinese/emoji is read as GBK
// 2. The corrupted content is written back

#include <cstdio>
#include <cstdint>
#include <fstream>
#include <string>
#include <vector>

void WriteFile(const char* filename, const std::vector<uint8_t>& bytes) {
    std::ofstream file(filename, std::ios::binary);
    file.write(reinterpret_cast<const char*>(bytes.data()), bytes.size());
    printf("Created: %s (%zu bytes)\n", filename, bytes.size());
}

int main() {
    printf("=== Creating test files that simulate encoding issues ===\n\n");
    
    // 1. Valid UTF-8 file with Chinese and emoji
    printf("1. Valid UTF-8 with Chinese and emoji:\n");
    // "你好⏱️" in UTF-8
    std::vector<uint8_t> valid_utf8 = {
        // console.log("
        0x63, 0x6F, 0x6E, 0x73, 0x6F, 0x6C, 0x65, 0x2E, 0x6C, 0x6F, 0x67, 0x28, 0x22,
        // 你 (U+4F60)
        0xE4, 0xBD, 0xA0,
        // 好 (U+597D)  
        0xE5, 0xA5, 0xBD,
        // ⏱ (U+23F1)
        0xE2, 0x8F, 0xB1,
        // ️ (U+FE0F - variation selector)
        0xEF, 0xB8, 0x8F,
        // ");
        0x22, 0x29, 0x3B, 0x0A
    };
    WriteFile("test_valid_utf8.js", valid_utf8);
    
    // 2. Simulated GBK encoding of "你好" (what Windows might produce)
    printf("\n2. GBK-encoded Chinese (invalid UTF-8):\n");
    std::vector<uint8_t> gbk_chinese = {
        // console.log("
        0x63, 0x6F, 0x6E, 0x73, 0x6F, 0x6C, 0x65, 0x2E, 0x6C, 0x6F, 0x67, 0x28, 0x22,
        // 你 in GBK: C4 E3
        0xC4, 0xE3,
        // 好 in GBK: BA C3
        0xBA, 0xC3,
        // ");
        0x22, 0x29, 0x3B, 0x0A
    };
    WriteFile("test_gbk_chinese.js", gbk_chinese);
    
    // 3. What happens when UTF-8 is misread as GBK then re-encoded
    // When 你 (E4 BD A0) is read as GBK:
    //   E4 BD -> 盲 (or garbage)
    //   A0 -> invalid or combined with next byte
    // This creates complete garbage
    printf("\n3. Corrupted content (UTF-8 misread as GBK):\n");
    std::vector<uint8_t> corrupted = {
        0x63, 0x6F, 0x6E, 0x73, 0x6F, 0x6C, 0x65, 0x2E, 0x6C, 0x6F, 0x67, 0x28, 0x22,
        // Garbage bytes that could result from encoding confusion
        0x80, 0x81, 0x82, 0x83,
        0x22, 0x29, 0x3B, 0x0A
    };
    WriteFile("test_corrupted.js", corrupted);
    
    // 4. File with UTF-8 BOM followed by content
    printf("\n4. UTF-8 with BOM:\n");
    std::vector<uint8_t> with_bom = {
        // UTF-8 BOM
        0xEF, 0xBB, 0xBF,
        // console.log("Hello");
        0x63, 0x6F, 0x6E, 0x73, 0x6F, 0x6C, 0x65, 0x2E, 0x6C, 0x6F, 0x67, 0x28, 
        0x22, 0x48, 0x65, 0x6C, 0x6C, 0x6F, 0x22, 0x29, 0x3B, 0x0A
    };
    WriteFile("test_with_bom.js", with_bom);
    
    // 5. File with non-character code point (valid UTF-8 but Chrome rejects!)
    printf("\n5. Valid UTF-8 but contains U+FFFE (Chrome rejects):\n");
    std::vector<uint8_t> with_nonchar = {
        0x63, 0x6F, 0x6E, 0x73, 0x6F, 0x6C, 0x65, 0x2E, 0x6C, 0x6F, 0x67, 0x28, 0x22,
        // U+FFFE (EF BF BE) - This is valid UTF-8 but a "non-character"
        0xEF, 0xBF, 0xBE,
        0x22, 0x29, 0x3B, 0x0A
    };
    WriteFile("test_nonchar_fffe.js", with_nonchar);
    
    // 6. Lone surrogate in "UTF-8" (sometimes produced by buggy code)
    printf("\n6. Encoded surrogate U+D800 (invalid in UTF-8):\n");
    std::vector<uint8_t> with_surrogate = {
        0x63, 0x6F, 0x6E, 0x73, 0x6F, 0x6C, 0x65, 0x2E, 0x6C, 0x6F, 0x67, 0x28, 0x22,
        // U+D800 encoded as if it were valid (ED A0 80)
        0xED, 0xA0, 0x80,
        0x22, 0x29, 0x3B, 0x0A
    };
    WriteFile("test_surrogate.js", with_surrogate);
    
    // 7. Simulated Windows issue: path with Chinese characters
    // When Node.js runs on Chinese Windows, it might produce paths like this
    printf("\n7. Import path with GBK-encoded Chinese folder name:\n");
    std::vector<uint8_t> bad_path = {
        // import x from "./
        0x69, 0x6D, 0x70, 0x6F, 0x72, 0x74, 0x20, 0x78, 0x20, 0x66, 0x72, 0x6F, 0x6D, 0x20, 0x22, 0x2E, 0x2F,
        // 文件夹 in GBK: CE C4 BC FE BC D0
        0xCE, 0xC4, 0xBC, 0xFE, 0xBC, 0xD0,
        // /file.js";
        0x2F, 0x66, 0x69, 0x6C, 0x65, 0x2E, 0x6A, 0x73, 0x22, 0x3B, 0x0A
    };
    WriteFile("test_gbk_path.js", bad_path);
    
    printf("\n=== Now run: ./test_utf8 test_*.js ===\n");
    
    return 0;
}
