import { describe, it, expect, expectTypeOf } from "vitest";
import * as bip39 from "bip39";
import { SeedManager } from "../../src/core/seedManager.js";

describe("Integration tests for Seed Manager", () => {

    // ── Default 2-of-3 behaviour ──────────────────────────────────────────

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
        expect(encrypted).toHaveLength(3);
        encrypted.forEach((frag) => {
            const parsed = JSON.parse(frag);
            expect(parsed).toHaveProperty("i");
            expect(parsed).toHaveProperty("data");
            expect(parsed).toHaveProperty("threshold", 2);
            expect(parsed).toHaveProperty("total", 3);
        });
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

    // ── Guardian mode: M-of-N splitting ──────────────────────────────────

    it.each([
        { total: 5, threshold: 3 },
        { total: 7, threshold: 4 },
        { total: 10, threshold: 5 },
        { total: 10, threshold: 10 },
    ])("Guardian mode: secureSeed with $total fragments (threshold $threshold) returns exactly $total fragments", async ({ total, threshold }) => {
        const seed = bip39.generateMnemonic(256);
        const passphrase = "@415WSfs)wwf5";
        const encrypted = await SeedManager.secureSeed({ seed, passphrase, totalFragments: total, threshold });

        expectTypeOf(encrypted).toEqualTypeOf<string[]>();
        expect(encrypted).toHaveLength(total);

        encrypted.forEach((frag, index) => {
            const parsed = JSON.parse(frag);
            expect(parsed.i).toBe(index + 1);
            expect(parsed).toHaveProperty("data");
            expect(parsed.threshold).toBe(threshold);
            expect(parsed.total).toBe(total);
            expect(parsed).toHaveProperty("bid");
        });
    })

    it("Guardian mode: should recover seed using exactly the threshold number of fragments (5 of 10)", async () => {
        const seed = bip39.generateMnemonic(256);
        const passphrase = "@415WSfs)wwf5";
        const encrypted = await SeedManager.secureSeed({ seed, passphrase, totalFragments: 10, threshold: 5 });

        expect(encrypted).toHaveLength(10);

        // Use only the first 5 fragments (exactly the threshold)
        const subset = encrypted.slice(0, 5);
        const decrypted = await SeedManager.recoverSeed(subset, passphrase);
        expect(decrypted).toBe(seed);
    })

    it("Guardian mode: should recover seed using a non-contiguous subset of fragments", async () => {
        const seed = bip39.generateMnemonic(256);
        const passphrase = "@415WSfs)wwf5";
        const encrypted = await SeedManager.secureSeed({ seed, passphrase, totalFragments: 10, threshold: 5 });

        // Use alternating fragments: indices 0, 2, 4, 6, 8
        const subset = [encrypted[0], encrypted[2], encrypted[4], encrypted[6], encrypted[8]];
        const decrypted = await SeedManager.recoverSeed(subset, passphrase);
        expect(decrypted).toBe(seed);
    })

    it("Guardian mode: should recover seed using more than threshold but fewer than total fragments", async () => {
        const seed = bip39.generateMnemonic(256);
        const passphrase = "@415WSfs)wwf5";
        const encrypted = await SeedManager.secureSeed({ seed, passphrase, totalFragments: 10, threshold: 3 });

        // Use 7 fragments (> threshold 3, < total 10)
        const subset = encrypted.slice(0, 7);
        const decrypted = await SeedManager.recoverSeed(subset, passphrase);
        expect(decrypted).toBe(seed);
    })

    it("Guardian mode: should throw when fewer than threshold fragments are provided", async () => {
        const seed = bip39.generateMnemonic(256);
        const passphrase = "@415WSfs)wwf5";
        const encrypted = await SeedManager.secureSeed({ seed, passphrase, totalFragments: 10, threshold: 5 });

        const tooFew = encrypted.slice(0, 4); // 4 < threshold 5
        await expect(SeedManager.recoverSeed(tooFew, passphrase)).rejects.toThrow(
            "You need at least 5 fragments."
        );
    })

    it("Guardian mode: should throw when fragments are from different backups", async () => {
        const seed = bip39.generateMnemonic(256);
        const passphrase = "@415WSfs)wwf5";
        const backup1 = await SeedManager.secureSeed({ seed, passphrase, totalFragments: 5, threshold: 3 });
        const backup2 = await SeedManager.secureSeed({ seed, passphrase, totalFragments: 5, threshold: 3 });

        const mixed = [backup1[0], backup1[1], backup2[2]];
        await expect(SeedManager.recoverSeed(mixed, passphrase)).rejects.toThrow(
            "Fragments are from different backups."
        );
    })

    // ── Community mode (no passphrase) with M-of-N ───────────────────────

    it("Community mode: secureSeed with 4-of-7 returns 7 fragments", async () => {
        const seed = bip39.generateMnemonic(256);
        const encrypted = await SeedManager.secureSeed({ seed, totalFragments: 7, threshold: 4 });

        expect(encrypted).toHaveLength(7);
    })

    it("Community mode: round-trip with threshold subset of fragments (no passphrase)", async () => {
        const seed = bip39.generateMnemonic(256);
        const encrypted = await SeedManager.secureSeed({ seed, totalFragments: 7, threshold: 4 });

        const subset = encrypted.slice(0, 4);
        const decrypted = await SeedManager.recoverSeed(subset);
        expect(decrypted).toBe(seed);
    })

});
