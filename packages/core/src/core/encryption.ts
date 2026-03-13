import * as crypto from "crypto";

export interface EncryptedSeed {
    cipherText: string;
    iv: string;
    salt: string;
    tag: string;
    iterations?: number; // absent in legacy data = 100_000; present = actual value used
}

export class AESEncryption {
    private static readonly ALGORITHM = "aes-256-gcm";
    private static readonly KEY_LENGTH = 32;
    private static readonly SALT_LENGTH = 64;
    private static readonly IV_LENGTH = 12;
    private static readonly ITERATIONS = 210_000; // OWASP 2023 minimum for PBKDF2-HMAC-SHA512

    private static deriveKey(passphrase: string, salt: Buffer, iterations = this.ITERATIONS): Buffer {
        return crypto.pbkdf2Sync(
            passphrase,
            salt,
            iterations,
            this.KEY_LENGTH,
            "sha512"
        )
    }

    static encrypt(seed: string, passphrase: string): EncryptedSeed {
        const salt: Buffer = crypto.randomBytes(this.SALT_LENGTH);
        const iv: Buffer = crypto.randomBytes(this.IV_LENGTH);
        const key: Buffer = this.deriveKey(passphrase, salt);

        try {
            const cipher = crypto.createCipheriv(this.ALGORITHM, key, iv);
            const cipherText = cipher.update(seed, "utf-8", "hex") + cipher.final("hex");
            const tag = cipher.getAuthTag();

            return {
                cipherText,
                iv: iv.toString("hex"),
                salt: salt.toString("hex"),
                tag: tag.toString("hex"),
                iterations: this.ITERATIONS,
            };
        } finally {
            key.fill(0);
        }
    }

    static decrypt(encrypted: EncryptedSeed, passphrase: string): string {
        const iv: Buffer = Buffer.from(encrypted.iv, "hex");
        const salt: Buffer = Buffer.from(encrypted.salt, "hex");
        const tag: Buffer = Buffer.from(encrypted.tag, "hex");
        const key: Buffer = this.deriveKey(passphrase, salt, encrypted.iterations ?? 100_000);

        try {
            const decipher = crypto.createDecipheriv(this.ALGORITHM, key, iv);
            decipher.setAuthTag(tag);

            let decrypted = decipher.update(encrypted.cipherText, "hex", "utf-8");
            decrypted += decipher.final("utf-8");

            return decrypted;
        } catch {
            throw new Error(
                "Decryption failed: Invalid passphrase or corrupted data",
            );
        } finally {
            key.fill(0);
        }
    }
}
