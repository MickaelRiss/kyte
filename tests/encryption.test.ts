import { describe, it, expect } from "vitest";
import { AESEncryption, EncryptedSeed } from "../src/core/encryption.js";

describe("Testing AES encryption", () => {
    const seed: string = "bridge total merit solar adjust duty fiction average find clarify prize ocean";
    const passphrase: string = "@Jl394sd8ueS!";
    
    it("Should encrypt and decrypt correctly: ", () => {
        const encryption: EncryptedSeed = AESEncryption.encrypt(seed, passphrase);
        const decryption: string = AESEncryption.decrypt(encryption, passphrase);

        expect(decryption).toBe(seed);
    })

    it("Should produce different ciphertext each time for same value: ", () => {
        const firstEncryption: EncryptedSeed = AESEncryption.encrypt(seed, passphrase);
        const secondEncryption: EncryptedSeed = AESEncryption.encrypt(seed, passphrase);

        expect(firstEncryption).not.toEqual(secondEncryption);
    })

    it("Should fail decryption with wrong passphrase: ", () => {
        const encryption: EncryptedSeed = AESEncryption.encrypt(seed, passphrase);
        const decryption = () => { AESEncryption.decrypt(encryption, "12HSKWrongPassword"); }

        expect(decryption).toThrowError();
    })

    it("Should return hex strings for all metadata fields", () => {
        const encryption = AESEncryption.encrypt(seed, passphrase);
        const hexRegex = /^[0-9a-fA-F]+$/;

        expect(encryption.iv).toMatch(hexRegex);
        expect(encryption.salt).toMatch(hexRegex);
        expect(encryption.tag).toMatch(hexRegex);
        expect(encryption.cipherText).toMatch(hexRegex);
    }); 

})   