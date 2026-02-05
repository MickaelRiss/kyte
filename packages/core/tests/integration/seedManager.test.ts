import { describe, it, expect, expectTypeOf } from "vitest";
import * as bip39 from "bip39";
import { SeedManager } from "../../src/core/seedManager.js";

describe("Integration tests for Seed Manager", () => {

    it.each([
        bip39.generateMnemonic(128),
        bip39.generateMnemonic(160),
        bip39.generateMnemonic(192),
        bip39.generateMnemonic(224),
        bip39.generateMnemonic(256),
    ])("Encryption should return 3 fragments with index and data value for each of them", async (seed) => {
        const passphrase: string = "@415WSfs)wwf5";
        const encrypted = await SeedManager.secureSeed({seed, passphrase});
        expectTypeOf(encrypted).toEqualTypeOf<string[]>();
        encrypted.forEach((frag) => {
            expect(frag).toContain("i");
            expect(frag).toContain("data");
        })
    })

    it.each([
        bip39.generateMnemonic(128),
        bip39.generateMnemonic(160),
        bip39.generateMnemonic(192),
        bip39.generateMnemonic(224),
        bip39.generateMnemonic(256),
    ])("Decryption should return a string with the same value than the original seed", async (seed) => {
        const passphrase: string = "@415WSfs)wwf5";
        const encrypted = await SeedManager.secureSeed({seed, passphrase});
        const decrypted = await SeedManager.recoverSeed(encrypted, passphrase);

        expectTypeOf(decrypted).toBeString();
        expect(decrypted).toBe(seed);
    })

    it("With empty seed, should always throw error", async () => {
        const passphrase: string = "@415WSfs)wwf5";
        const seed: string = "";
        await expect(SeedManager.secureSeed({ seed, passphrase })).rejects.toThrowError();
    })

    it("With invalid seed, should always throw error", async () => {
        const passphrase: string = "@415WSfs)wwf5";
        const seed: string = "bridge total merit solar adjust duty fiction average find clarify xyznotaword";
        await expect(SeedManager.secureSeed({ seed, passphrase })).rejects.toThrowError();
    })

    it("With invalid password, should always throw error", async () => {
        const passphrase: string = "@415WSfs)wwf5";
        const wrongPassphrase: string = "@415WSfs)wwf";
        const seed = bip39.generateMnemonic(256);
        const encrypted = await SeedManager.secureSeed({ seed, passphrase });
        await expect(SeedManager.recoverSeed(encrypted, wrongPassphrase)).rejects.toThrowError();
    })

});
