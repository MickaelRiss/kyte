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
        const encryptionResult = AESEncryption.encrypt(seedNormalize, passphrase);
        // JSON Stringify 
        const encryptedJson = JSON.stringify(encryptionResult);
        // Split Shamir
        const shamirResult = await ShamirSecret.split(encryptedJson);
        // New encrypton for Frag3
        const fragmentC = AESEncryption.encrypt(shamirResult.fragments[2], passphrase);
        return {
            fragmentB: shamirResult.fragments[1],
            fragmentC,
            metadata: {
                threshold: shamirResult.threshold,
                total: shamirResult.total,
                created: new Date()
            }
        };
    }
    static async recoverSeed(encrypted, passphrase) {
        // Get Fragment B
        const fragmentB = encrypted.fragmentB;
        // Get and decrypt Fragment C
        const fragmentCEncrypted = encrypted.fragmentC;
        const fragmentC = AESEncryption.decrypt(fragmentCEncrypted, passphrase);
        // Combine 2 fragments to get the secret value
        const encryptedJson = await ShamirSecret.combine([fragmentB, fragmentC]);
        // Combine => return string
        const encryptedData = JSON.parse(encryptedJson);
        const seed = AESEncryption.decrypt(encryptedData, passphrase);
        const normalizedSeed = SeedValidator.normalizeSeed(seed);
        if (!SeedValidator.validateSeed(normalizedSeed)) {
            throw new Error('❌ Critical Error : Seed invalid !');
        }
        return normalizedSeed;
    }
}
