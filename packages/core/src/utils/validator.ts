import * as bip39 from "bip39";

export class SeedValidator {
  static validateSeed(seed: string): boolean {
    return bip39.validateMnemonic(seed);
  }

  static normalizeSeed(seed: string): string {
    return seed.trim().toLowerCase();
  }

}
