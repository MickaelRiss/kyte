import { SeedValidator } from "../utils/validator.js";
import { AESEncryption } from "./encryption.js";
import { ShamirSecret } from "./shamir.js";
export class SeedManager {
    static async secureSeed({ seed, passphrase }) {
        // Validate
        const seedNormalize = SeedValidator.normalizeSeed(seed);
        const finalSeed = SeedValidator.validateSeed(seedNormalize);
        if (!finalSeed)
            throw new Error("Your seed isn't following bip39 convention, please contact your platform.");
        // Encrypt
        const encrypted = AESEncryption.encrypt(seedNormalize, passphrase);
        // JSON Stringify 
        const encryptedJson = JSON.stringify(encrypted);
        // Split Shamir
        const shamirResult = await ShamirSecret.split(encryptedJson);
        // Create JSON stringify object for each frag
        const [fragmentA, fragmentB, fragmentC] = shamirResult.fragments.map((fragment, index) => (JSON.stringify({ i: index + 1, data: fragment })));
        return [fragmentA, fragmentB, fragmentC];
    }
}
