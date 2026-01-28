import { SeedValidator } from "../utils/validator.js";
import { AESEncryption, EncryptedSeed } from "./encryption.js";
import { ShamirSecret } from "./shamir.js";

interface UserInformations {
    seed: string;
    passphrase: string;
}

export interface EncryptedResult {
    fragmentB: string;
    fragmentC: EncryptedSeed;
    metadata: any;
}

export class SeedManager {
    static async secureSeed({ seed, passphrase }: UserInformations): Promise<EncryptedResult> {
        // Validate
        const seedNormalize = SeedValidator.normalizeSeed(seed);
        const finalSeed = SeedValidator.validateSeed(seedNormalize);
        if (!finalSeed) throw new Error("Your seed isn't following bip39 convention, please contact your platform.");
        // Encrypt
        const encryptionResult: EncryptedSeed = AESEncryption.encrypt(seedNormalize, passphrase);
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
        }
    }

    static async recoverSeed(encrypted: EncryptedResult, passphrase: string): Promise<string> {
        // Get Fragment B
        const fragmentB: string = encrypted.fragmentB;
        
        // Get and decrypt Fragment C
        const fragmentCEncrypted: EncryptedSeed = encrypted.fragmentC;
        const fragmentC = AESEncryption.decrypt(fragmentCEncrypted, passphrase);

        // Combine 2 fragments to get the secret value
        const encryptedJson = await ShamirSecret.combine([fragmentB, fragmentC]);
        
        // Combine => return string
        const encryptedData: EncryptedSeed = JSON.parse(encryptedJson);
        const seed: string = AESEncryption.decrypt(encryptedData, passphrase);
        const normalizedSeed = SeedValidator.normalizeSeed(seed);
        
        if (!SeedValidator.validateSeed(normalizedSeed)) {
            throw new Error('❌ Critical Error : Seed invalid !');
        }
        
        return normalizedSeed;
    }
}