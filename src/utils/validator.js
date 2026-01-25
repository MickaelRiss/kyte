import * as bip39 from "bip39";
export class SeedValidator {
    static validateSeed(seed) {
        return bip39.validateMnemonic(seed);
    }
    static normalizeSeed(seed) {
        return seed.trim().toLocaleLowerCase();
    }
    static countSeedWord(seed) {
        return this.normalizeSeed(seed).split(/\s+/).length;
    }
}
