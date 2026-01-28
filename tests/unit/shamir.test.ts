import { describe, it, expect } from "vitest";
import { ShamirSecret } from "../../src/core/shamir.js";

describe("Testing Shamir secret sharing", () => {
    const testSecret = "this is a secret string to split";

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
        const recovered = await ShamirSecret.combine([fragments[0], fragments[1]]);

        expect(recovered).toBe(testSecret);
    });

    it("Should reconstruct the secret from all 3 fragments", async () => {
        const { fragments } = await ShamirSecret.split(testSecret);
        const recovered = await ShamirSecret.combine(fragments);

        expect(recovered).toBe(testSecret);
    });

    it("Should throw when combining with fewer than 2 fragments", async () => {
        const { fragments } = await ShamirSecret.split(testSecret);

        await expect(ShamirSecret.combine([fragments[0]])).rejects.toThrow(
            "You need at least 2 fragments."
        );
    });
});
