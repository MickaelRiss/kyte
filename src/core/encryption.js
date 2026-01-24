import * as crypto from "crypto";
export class AESEncryption {
    static ALGORITHM = "aes-256-gcm";
    static KEY_LENGTH = 32;
    static SALT_LENGTH = 64;
    static IV_LENGTH = 16;
    static ITERATIONS = 100000;
    static deriveKey(passphrase, salt) {
        return crypto.pbkdf2Sync(passphrase, salt, this.ITERATIONS, this.KEY_LENGTH, "sha512");
    }
    static encrypt(seed, passphrase) {
        const salt = crypto.randomBytes(this.SALT_LENGTH);
        const iv = crypto.randomBytes(this.IV_LENGTH);
        // Create derived key
        const key = this.deriveKey(passphrase, salt);
        // Create cipher
        const cipher = crypto.createCipheriv(this.ALGORITHM, key, iv);
        // Encrypt cipher text
        let cipherText = cipher.update(seed, "utf-8", "hex");
        cipherText += cipher.final("hex");
        // Get tag
        const tag = cipher.getAuthTag();
        return {
            cipherText,
            iv: iv.toString("hex"),
            salt: salt.toString("hex"),
            tag: tag.toString("hex")
        };
    }
    static decrypt(encrypted, passphrase) {
        try {
            const cipherText = encrypted.cipherText;
            const iv = Buffer.from(encrypted.iv, "hex");
            const salt = Buffer.from(encrypted.salt, "hex");
            const tag = Buffer.from(encrypted.tag, "hex");
            const key = this.deriveKey(passphrase, salt);
            // Create decipher
            const decipher = crypto.createDecipheriv(this.ALGORITHM, key, iv);
            decipher.setAuthTag(tag);
            // Decrypt
            let decrypted = decipher.update(cipherText, "hex", "utf-8");
            decrypted += decipher.final("utf-8");
            return decrypted;
        }
        catch (error) {
            throw new Error('Decryption failed: Invalid passphrase or corrupted data');
        }
    }
}
