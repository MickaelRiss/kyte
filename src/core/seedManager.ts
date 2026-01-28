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

    // static async recoverSeed(encrypted: EncryptedResult, passphrase: string): Promise<string> {
    //     // Get Fragment B
    //     const fragmentB: string = encrypted.fragmentB;
        
    //     // Get and decrypt Fragment C
    //     const fragmentCEncrypted: EncryptedSeed = encrypted.fragmentC;
    //     const fragmentC = AESEncryption.decrypt(fragmentCEncrypted, passphrase);

    //     // Combine 2 fragments to get the secret value
    //     const encryptedJson = await ShamirSecret.combine([fragmentB, fragmentC]);
        
    //     // Combine => return string
    //     const encryptedData: EncryptedSeed = JSON.parse(encryptedJson);
    //     const seed: string = AESEncryption.decrypt(encryptedData, passphrase);
    //     const normalizedSeed = SeedValidator.normalizeSeed(seed);
        
    //     if (!SeedValidator.validateSeed(normalizedSeed)) {
    //         throw new Error('❌ Critical Error : Seed invalid !');
    //     }
        
    //     return normalizedSeed;
    // }
}