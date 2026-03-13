import { randomBytes } from "node:crypto";
import { SeedValidator } from "../utils/validator.js";
import { AESEncryption, EncryptedSeed } from "./encryption.js";
import { ShamirSecret } from "./shamir.js";

export interface UserInformations {
  seed: string;
  passphrase?: string; // Optional: undefined = Community (Shamir-only), string = Pro (double encryption)
  threshold?: number;
  totalFragments?: number;
}

export class SeedManager {
  static async secureSeed({
    seed,
    passphrase,
    threshold,
    totalFragments,
  }: UserInformations): Promise<string[]> {
    // Validate
    const seedNormalize = SeedValidator.normalizeSeed(seed);
    const finalSeed = SeedValidator.validateSeed(seedNormalize);
    if (!finalSeed)
      throw new Error(
        "Your seed isn't following bip39 convention, please contact your platform.",
      );

    // Determine what to split based on license tier
    let dataToSplit: string;

    if (passphrase) {
      // Pro version: double encryption (AES + Shamir)
      const encrypted: EncryptedSeed = AESEncryption.encrypt(
        seedNormalize,
        passphrase,
      );
      dataToSplit = JSON.stringify(encrypted);
    } else {
      // Community version: Shamir-only (no passphrase encryption)
      dataToSplit = seedNormalize;
    }

    // Split with Shamir
    const shamirResult = await ShamirSecret.split(
      dataToSplit,
      totalFragments,
      threshold,
    );

    // Generate a non-secret backup ID to detect fragments from different backups
    const backupId = randomBytes(16).toString("hex");

    const fragments = shamirResult.fragments.map((fragment, index) => {
      return JSON.stringify({
        i: index + 1,
        data: fragment,
        threshold: shamirResult.threshold,
        total: shamirResult.total,
        bid: backupId,
      });
    });

    return fragments;
  }

  static async recoverSeed(
    fragments: string[],
    passphrase?: string,
  ): Promise<string> {
    // Extract hex data and threshold from fragment JSON strings
    const parsedFragments = fragments.map((fragment) => {
      try {
        const parsed = JSON.parse(fragment);
        if (!parsed?.data || typeof parsed.threshold !== "number")
          throw new Error();
        return {
          i: parsed.i as number,
          hex: parsed.data as string,
          threshold: parsed.threshold as number,
          bid: typeof parsed.bid === "string" ? parsed.bid : undefined,
        };
      } catch {
        throw new Error(
          "Invalid fragment format. Please check that you copied the fragment correctly.",
        );
      }
    });

    // Verify all fragments agree on the same threshold
    const thresholds = new Set(parsedFragments.map((f) => f.threshold));
    if (thresholds.size > 1) {
      throw new Error(
        "Fragments do not match: they were created with different settings. Make sure all fragments are from the same backup.",
      );
    }

    // Verify all fragments share the same backup ID (catches mixing fragments from different backups)
    const bids = new Set(parsedFragments.map((f) => f.bid).filter((bid): bid is string => bid !== undefined));
    if (bids.size > 1) {
      throw new Error(
        "Fragments are from different backups. Make sure all fragments are from the same backup.",
      );
    }

    const threshold = parsedFragments[0].threshold;
    const fragmentsHex = parsedFragments.map((f) => f.hex);

    // Shamir combine to recover the data
    const combinedData = await ShamirSecret.combine(fragmentsHex, threshold);

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
