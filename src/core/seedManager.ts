import { SeedValidator } from "../utils/validator.js";
import { AESEncryption, EncryptedSeed } from "./encryption.js";
import { ShamirSecret } from "./shamir.js";

interface UserInformations {
    seed: string;
    passphrase: string;
}

export class SeedManager {
    static async secureSeed({ seed, passphrase }: UserInformations): Promise<string[]> {
        // Validate
        const seedNormalize = SeedValidator.normalizeSeed(seed);
        const finalSeed = SeedValidator.validateSeed(seedNormalize);
        if (!finalSeed) throw new Error("Your seed isn't following bip39 convention, please contact your platform.");
        // Encrypt
        const encrypted: EncryptedSeed = AESEncryption.encrypt(seedNormalize, passphrase);
        // JSON Stringify 
        const encryptedJson = JSON.stringify(encrypted);
        // Split Shamir
        const shamirResult = await ShamirSecret.split(encryptedJson);
        // Create JSON stringify object for each frag
        const [fragmentA, fragmentB, fragmentC] = shamirResult.fragments.map((fragment, index) => (
            JSON.stringify({ i: index + 1, data: fragment })
        ));

        return [fragmentA, fragmentB, fragmentC]
    }

    static async recoverSeed(fragments: string[], passphrase: string): Promise<string> {
        // Extract hex data from fragment JSON strings
        const fragmentsHex = fragments.map((fragment) => {
            const parsed = JSON.parse(fragment);
            return parsed.data as string;
        });

        // Shamir combine to recover the encrypted seed JSON
        const encryptedJson = await ShamirSecret.combine(fragmentsHex);

        // AES decrypt to recover the seed
        const encryptedData: EncryptedSeed = JSON.parse(encryptedJson);
        const seed = AESEncryption.decrypt(encryptedData, passphrase);

        // Validate recovered seed
        const normalizedSeed = SeedValidator.normalizeSeed(seed);
        if (!SeedValidator.validateSeed(normalizedSeed)) {
            throw new Error("Recovered seed is not a valid BIP39 mnemonic.");
        }

        return normalizedSeed;
    }
}