import { describe, it, expect } from "vitest";
import { ShamirSecret } from "../../src/core/shamir.js";

describe("Testing Shamir secret sharing", () => {
    const testSecret = "this is a secret string to split";

    // ── Default 2-of-3 behaviour ──────────────────────────────────────────

    it("Should split a secret into 3 hex fragments", async () => {
        const result = await ShamirSecret.split(testSecret);

        expect(result.fragments).toHaveLength(3);
        expect(result.threshold).toBe(2);
        expect(result.total).toBe(3);
    });

    it("Should produce valid hex strings as fragments", async () => {
        const result = await ShamirSecret.split(testSecret);
        const hexRegex = /^[0-9a-f]+$/;

        for (const fragment of result.fragments) {
            expect(fragment).toMatch(hexRegex);
        }
    });

    it("Should reconstruct the secret from 2 fragments", async () => {
        const { fragments } = await ShamirSecret.split(testSecret);
        const recovered = await ShamirSecret.combine([fragments[0], fragments[1]], 2);

        expect(recovered).toBe(testSecret);
    });

    it("Should reconstruct the secret from all 3 fragments", async () => {
        const { fragments, threshold } = await ShamirSecret.split(testSecret);
        const recovered = await ShamirSecret.combine(fragments, threshold);

        expect(recovered).toBe(testSecret);
    });

    it("Should throw when combining with fewer than 2 fragments", async () => {
        const { fragments } = await ShamirSecret.split(testSecret);

        await expect(ShamirSecret.combine([fragments[0]], 2)).rejects.toThrow(
            "You need at least 2 fragments."
        );
    });

    // ── M-of-N Guardian splitting ─────────────────────────────────────────

    it.each([
        { total: 5, threshold: 3 },
        { total: 7, threshold: 4 },
        { total: 10, threshold: 5 },
        { total: 10, threshold: 10 },
    ])("Should split into $total fragments with threshold $threshold", async ({ total, threshold }) => {
        const result = await ShamirSecret.split(testSecret, total, threshold);

        expect(result.fragments).toHaveLength(total);
        expect(result.threshold).toBe(threshold);
        expect(result.total).toBe(total);
    });

    it("Should produce valid hex strings for all M-of-N fragments", async () => {
        const result = await ShamirSecret.split(testSecret, 10, 5);
        const hexRegex = /^[0-9a-f]+$/;

        for (const fragment of result.fragments) {
            expect(fragment).toMatch(hexRegex);
        }
    });

    it("Should reconstruct from exactly the threshold number of fragments (first N)", async () => {
        const { fragments, threshold } = await ShamirSecret.split(testSecret, 10, 5);
        const subset = fragments.slice(0, threshold);
        const recovered = await ShamirSecret.combine(subset, threshold);

        expect(recovered).toBe(testSecret);
    });

    it("Should reconstruct from a non-contiguous subset of fragments", async () => {
        const { fragments, threshold } = await ShamirSecret.split(testSecret, 10, 5);
        // Pick odd-indexed fragments: 0, 2, 4, 6, 8
        const subset = [fragments[0], fragments[2], fragments[4], fragments[6], fragments[8]];
        const recovered = await ShamirSecret.combine(subset, threshold);

        expect(recovered).toBe(testSecret);
    });

    it("Should reconstruct from all fragments when total equals threshold", async () => {
        const { fragments, threshold } = await ShamirSecret.split(testSecret, 5, 5);
        const recovered = await ShamirSecret.combine(fragments, threshold);

        expect(recovered).toBe(testSecret);
    });

    it("Should throw when combining with fewer than threshold fragments", async () => {
        const { fragments } = await ShamirSecret.split(testSecret, 10, 5);
        const tooFew = fragments.slice(0, 4); // 4 < threshold 5

        await expect(ShamirSecret.combine(tooFew, 5)).rejects.toThrow(
            "You need at least 5 fragments."
        );
    });

    // ── Parameter validation ──────────────────────────────────────────────

    it("Should throw when totalFragments is below minimum (< 3)", async () => {
        await expect(ShamirSecret.split(testSecret, 2, 2)).rejects.toThrow(
            "Total fragments must be between 3 and 10."
        );
    });

    it("Should throw when totalFragments exceeds maximum (> 10)", async () => {
        await expect(ShamirSecret.split(testSecret, 11, 5)).rejects.toThrow(
            "Total fragments must be between 3 and 10."
        );
    });

    it("Should throw when threshold is below minimum (< 2)", async () => {
        await expect(ShamirSecret.split(testSecret, 5, 1)).rejects.toThrow(
            "Threshold must be at least 2."
        );
    });

    it("Should throw when threshold exceeds totalFragments", async () => {
        await expect(ShamirSecret.split(testSecret, 5, 6)).rejects.toThrow(
            "Threshold must not exceed total fragments."
        );
    });
});
