import { split, combine } from "shamir-secret-sharing";
export class ShamirSecret {
    static THRESHOLD = 2;
    static TOTALFRAGMENTS = 3;
    static toUint8Array(data) {
        return new TextEncoder().encode(data);
    }
    static fromUint8Array(array) {
        return new TextDecoder().decode(array);
    }
    static uint8ArrayToHex(array) {
        return Array.from(array)
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    }
    static hexToUint8Array(hex) {
        if (hex.length % 2 !== 0) {
            throw new Error('Invalid hex string');
        }
        const matches = hex.match(/.{1,2}/g) || [];
        return new Uint8Array(matches.map(byte => parseInt(byte, 16)));
    }
    static async split(seedEncrypted) {
        const secret = this.toUint8Array(seedEncrypted);
        const sharesUint8 = await split(secret, this.TOTALFRAGMENTS, this.THRESHOLD);
        const fragmentsHex = sharesUint8.map(share => this.uint8ArrayToHex(share));
        return {
            fragments: fragmentsHex,
            threshold: this.THRESHOLD,
            total: this.TOTALFRAGMENTS,
        };
    }
    static async combine(fragmentsHex) {
        if (fragmentsHex.length < this.THRESHOLD)
            throw new Error(`You need at least ${this.THRESHOLD} fragments.`);
        const sharesUint8 = fragmentsHex.map((hex) => this.hexToUint8Array(hex));
        const reconstructed = await combine(sharesUint8);
        const seedEncypted = this.fromUint8Array(reconstructed);
        return seedEncypted;
    }
}
