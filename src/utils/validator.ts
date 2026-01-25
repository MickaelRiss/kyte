import * as bip39 from "bip39";

export class SeedValidator {
    static validateSeed(seed: string): boolean {
        return bip39.validateMnemonic(seed);
    }

    static normalizeSeed(seed: string): string {
        return seed.trim().toLocaleLowerCase();
    }

    static countSeedWord(seed: string): number {
        return this.normalizeSeed(seed).split(/\s+/).length;
    }
}