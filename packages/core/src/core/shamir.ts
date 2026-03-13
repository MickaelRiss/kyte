import { split, combine } from "shamir-secret-sharing";

export interface ShamirSplit {
  fragments: string[];
  threshold: number;
  total: number;
}

export class ShamirSecret {
  private static toUint8Array(data: string): Uint8Array {
    return new TextEncoder().encode(data);
  }

  private static fromUint8Array(array: Uint8Array): string {
    return new TextDecoder().decode(array);
  }

  private static uint8ArrayToHex(array: Uint8Array): string {
    return Array.from(array)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }

  private static hexToUint8Array(hex: string): Uint8Array {
    if (hex.length % 2 !== 0) {
      throw new Error("Invalid hex string");
    }
    const matches = hex.match(/.{1,2}/g) || [];
    return new Uint8Array(matches.map((byte) => parseInt(byte, 16)));
  }

  static async split(
    seedEncrypted: string,
    totalFragments: number = 3,
    threshold: number = 2,
  ): Promise<ShamirSplit> {
    if (totalFragments < 3 || totalFragments > 10) {
      throw new Error("Total fragments must be between 3 and 10.");
    }

    if (threshold < 2) {
      throw new Error("Threshold must be at least 2.");
    }

    if (threshold > totalFragments) {
      throw new Error("Threshold must not exceed total fragments.");
    }
    const secret = this.toUint8Array(seedEncrypted);
    const sharesUint8 = await split(secret, totalFragments, threshold);
    const fragmentsHex = sharesUint8.map((share) =>
      this.uint8ArrayToHex(share),
    );
    return {
      fragments: fragmentsHex,
      threshold,
      total: totalFragments,
    };
  }

  static async combine(
    fragmentsHex: string[],
    threshold: number = 2,
  ): Promise<string> {
    if (fragmentsHex.length < threshold)
      throw new Error(`You need at least ${threshold} fragments.`);

    const sharesUint8 = fragmentsHex.map((hex) => this.hexToUint8Array(hex));
    const reconstructed = await combine(sharesUint8);
    const seedEncypted = this.fromUint8Array(reconstructed);
    return seedEncypted;
  }
}
