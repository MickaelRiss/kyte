import { describe, it, expect } from "vitest";
import { AESEncryption } from "../src/core/encryption.js";
describe("Testing AES encryption", () => {
    const seed = "bridge total merit solar adjust duty fiction average find clarify prize ocean";
    const passphrase = "@Jl394sd8ueS!";
    it("Should encrypt and decrypt correctly: ", () => {
        const encryption = AESEncryption.encrypt(seed, passphrase);
        const decryption = AESEncryption.decrypt(encryption, passphrase);
        expect(decryption).toBe(seed);
    });
    it("Should produce different ciphertext each time for same value: ", () => {
        const firstEncryption = AESEncryption.encrypt(seed, passphrase);
        const secondEncryption = AESEncryption.encrypt(seed, passphrase);
        expect(firstEncryption).not.toEqual(secondEncryption);
    });
    it("Should fail decryption with wrong passphrase: ", () => {
        const encryption = AESEncryption.encrypt(seed, passphrase);
        const decryption = () => { AESEncryption.decrypt(encryption, "12HSKWrongPassword"); };
        expect(decryption).toThrowError();
    });
    it("Should return hex strings for all metadata fields", () => {
        const encryption = AESEncryption.encrypt(seed, passphrase);
        const hexRegex = /^[0-9a-fA-F]+$/;
        expect(encryption.iv).toMatch(hexRegex);
        expect(encryption.salt).toMatch(hexRegex);
        expect(encryption.tag).toMatch(hexRegex);
        expect(encryption.cipherText).toMatch(hexRegex);
    });
});
