import PromptSync from "prompt-sync";
import { EncryptedSeed, AESEncryption } from "../src/core/encryption.js"

// 2. Stringify le chiffrement AES
// 3. Implementer le Shamir Split pour 3 fragments et en jeter 1

const prompt = PromptSync();

console.log(
    "Welcome to SeedGuard! 🛡️\nPress 1 if you want to encrypt.\nPress 2 if you want to decrypt."
);
let answer: number = Number(prompt("Choice: "));

while(answer !== 1 && answer !== 2) {
    console.log("Please, Press 1 if you want to encrypt.\nPress 2 if you want to decrypt.")
    answer = Number(prompt("Choice: "));
}

const passphrase: string = prompt("Please enter your passphrase: ");

if (answer === 1) {
    const seed: string = prompt("Please enter your seedphrase: ");
    const encrypt: EncryptedSeed = AESEncryption.encrypt(seed, passphrase);
    console.log("Please save your encryption carefully or you won't be able to decrypt later: ", encrypt);
} else if (answer === 2) {
    const cipherText: string = prompt("Please enter you cipher text: ");
    const iv: string = prompt("Please enter you iv: ");
    const salt: string = prompt("Please enter you salt: ");
    const tag: string = prompt("Please enter you tag: ");
    const encrypt: EncryptedSeed = {
        cipherText,
        iv,
        salt,
        tag
    }
    const decrypt: string = AESEncryption.decrypt(encrypt, passphrase);
    console.log(decrypt);
}