import { SeedValidator } from "../utils/validator.js";
import { AESEncryption, EncryptedSeed } from "./encryption.js";
import { ShamirSecret } from "./shamir.js";

export interface UserInformations {
    seed: string;
    passphrase?: string; // Optional: undefined = Community (Shamir-only), string = Pro (double encryption)
}

export class SeedManager {
    static async secureSeed({ seed, passphrase }: UserInformations): Promise<string[]> {
        // Validate
        const seedNormalize = SeedValidator.normalizeSeed(seed);
        const finalSeed = SeedValidator.validateSeed(seedNormalize);
        if (!finalSeed) throw new Error("Your seed isn't following bip39 convention, please contact your platform.");

        // Determine what to split based on license tier
        let dataToSplit: string;

        if (passphrase) {
            // Pro version: double encryption (AES + Shamir)
            const encrypted: EncryptedSeed = AESEncryption.encrypt(seedNormalize, passphrase);
            dataToSplit = JSON.stringify(encrypted);
        } else {
            // Community version: Shamir-only (no passphrase encryption)
            dataToSplit = seedNormalize;
        }

        // Split with Shamir
        const shamirResult = await ShamirSecret.split(dataToSplit);

        // Create JSON stringify object for each fragment
        const [fragmentA, fragmentB, fragmentC] = shamirResult.fragments.map((fragment, index) => (
            JSON.stringify({ i: index + 1, data: fragment })
        ));

        return [fragmentA, fragmentB, fragmentC]
    }

    static async recoverSeed(fragments: string[], passphrase?: string): Promise<string> {
        // Extract hex data from fragment JSON strings
        const fragmentsHex = fragments.map((fragment) => {
            const parsed = JSON.parse(fragment);
            return parsed.data as string;
        });

        // Shamir combine to recover the data
        const combinedData = await ShamirSecret.combine(fragmentsHex);

        // Determine if we need to decrypt based on license tier
        let seed: string;

        if (passphrase) {
            // Pro version: decrypt the AES-encrypted data
            const encryptedData: EncryptedSeed = JSON.parse(combinedData);
            seed = AESEncryption.decrypt(encryptedData, passphrase);
        } else {
            // Community version: combined data is the raw seed
            seed = combinedData;
        }

        // Validate recovered seed
        const normalizedSeed = SeedValidator.normalizeSeed(seed);
        if (!SeedValidator.validateSeed(normalizedSeed)) {
            throw new Error("Recovered seed is not a valid BIP39 mnemonic.");
        }

        return normalizedSeed;
    }
}