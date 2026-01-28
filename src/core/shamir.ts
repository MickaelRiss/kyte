import { split, combine } from "shamir-secret-sharing";

interface ShamirSplit {
    fragments: string[];
    threshold: number;
    total: number;
}

export class ShamirSecret {
    private static readonly THRESHOLD: number = 2;
    private static readonly TOTALFRAGMENTS: number = 3;

    private static toUint8Array(data: string):Uint8Array {
        return new TextEncoder().encode(data);
    }

    private static fromUint8Array(array: Uint8Array): string {
        return new TextDecoder().decode(array);
    }

    private static uint8ArrayToHex(array: Uint8Array): string {
        return Array.from(array)
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    }

    private static hexToUint8Array(hex: string): Uint8Array {
        if (hex.length % 2 !== 0) {
            throw new Error('Invalid hex string');
        }
        const matches = hex.match(/.{1,2}/g) || [];
        return new Uint8Array(matches.map(byte => parseInt(byte, 16)));
    }

    static async split(seedEncrypted: string): Promise<ShamirSplit> {
        const secret = this.toUint8Array(seedEncrypted);
        const sharesUint8 = await split(secret, this.TOTALFRAGMENTS, this.THRESHOLD);
        const fragmentsHex = sharesUint8.map(share => this.uint8ArrayToHex(share));
        return {
            fragments: fragmentsHex,
            threshold: this.THRESHOLD,
            total: this.TOTALFRAGMENTS,
        }
    }

    static async combine(fragmentsHex: string[]): Promise<string> {
        if (fragmentsHex.length < this.THRESHOLD) throw new Error (`You need at least ${this.THRESHOLD} fragments.`);

        const sharesUint8 = fragmentsHex.map((hex) => this.hexToUint8Array(hex));
        const reconstructed = await combine(sharesUint8);
        const seedEncypted = this.fromUint8Array(reconstructed);
        return seedEncypted;
    }
}