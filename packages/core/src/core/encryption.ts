import * as crypto from "crypto";

export interface EncryptedSeed {
    cipherText: string;
    iv: string;
    salt: string;
    tag: string;
}

export class AESEncryption {
    private static readonly ALGORITHM = "aes-256-gcm";
    private static readonly KEY_LENGTH = 32;
    private static readonly SALT_LENGTH = 64;
    private static readonly IV_LENGTH = 16;
    private static readonly ITERATIONS = 100000;

    private static deriveKey(passphrase: string, salt: Buffer): Buffer {
        return crypto.pbkdf2Sync(
            passphrase,
            salt,
            this.ITERATIONS,
            this.KEY_LENGTH,
            "sha512"
        )
    }

    static encrypt(seed: string, passphrase: string): EncryptedSeed {
        const salt: Buffer = crypto.randomBytes(this.SALT_LENGTH);
        const iv: Buffer = crypto.randomBytes(this.IV_LENGTH);
        
        // Create derived key
        const key: Buffer = this.deriveKey(passphrase, salt);
        
        // Create cipher
        const cipher = crypto.createCipheriv(this.ALGORITHM, key, iv)

        // Encrypt cipher text
        let cipherText = cipher.update(seed, "utf-8", "hex");
        cipherText += cipher.final("hex");

        // Get tag
        const tag: Buffer = cipher.getAuthTag();

        return {
            cipherText,
            iv: iv.toString("hex"),
            salt: salt.toString("hex"),
            tag: tag.toString("hex")
        }
    }

    static decrypt(encrypted: EncryptedSeed, passphrase: string): string {
        try {
            const cipherText: string = encrypted.cipherText;
            const iv: Buffer = Buffer.from(encrypted.iv, "hex");
            const salt: Buffer = Buffer.from(encrypted.salt, "hex");
            const tag: Buffer = Buffer.from(encrypted.tag, "hex");
            const key: Buffer = this.deriveKey(passphrase, salt);
            
            // Create decipher
            const decipher = crypto.createDecipheriv(this.ALGORITHM, key, iv);
            decipher.setAuthTag(tag);

            // Decrypt
            let decrypted = decipher.update(cipherText, "hex", "utf-8");
            decrypted += decipher.final("utf-8");
            
            return decrypted;

        } catch {
            throw new Error('Decryption failed: Invalid passphrase or corrupted data');
        }
    }
}