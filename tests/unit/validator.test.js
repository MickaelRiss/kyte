import { describe, it, expect } from "vitest";
import * as bip39 from "bip39";
import { SeedValidator } from "../../src/utils/validator.js";
describe("Testing seed validation", () => {
    it.each([
        { seed: bip39.generateMnemonic(128), expected: true },
        { seed: bip39.generateMnemonic(160), expected: true },
        { seed: bip39.generateMnemonic(192), expected: true },
        { seed: bip39.generateMnemonic(224), expected: true },
        { seed: bip39.generateMnemonic(256), expected: true },
        { seed: "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon art", expected: true },
        // Wrong checksum
        { seed: "tuna tiny arrow shadow keep moon meal negative direct stadium task ocean", expected: false },
        // Invalid word
        { seed: "bridge total merit solar adjust duty fiction average find clarify prize cryptooo", expected: false },
        // Missing one word
        { seed: "bridge total merit solar adjust duty fiction average find clarify prize", expected: false },
        // Numbers inside
        { seed: "12345 total 12345 67890 duty 67890 lae45 67890 12345 67890 12345 67890", expected: false },
    ])("Should return $expected for seed: $seed", ({ seed, expected }) => {
        const normalized = SeedValidator.normalizeSeed(seed);
        expect(SeedValidator.validateSeed(normalized)).toBe(expected);
    });
    it("Should validate a seed even with messy formatting", () => {
        const validSeed = "ABANDON abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon art ";
        const normalized = SeedValidator.normalizeSeed(validSeed);
        expect(normalized).toBe("abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon art");
        expect(SeedValidator.validateSeed(normalized)).toBe(true);
    });
});
