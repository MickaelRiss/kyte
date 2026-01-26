import PromptSync from "prompt-sync";
import { AESEncryption } from "../src/core/encryption.js";
// 2. Stringify le chiffrement AES
// 3. Implementer le Shamir Split pour 3 fragments et en jeter 1
const prompt = PromptSync();
console.log("Welcome to SeedGuard! 🛡️\nPress 1 if you want to encrypt.\nPress 2 if you want to decrypt.");
let answer = Number(prompt("Choice: "));
while (answer !== 1 && answer !== 2) {
    console.log("Please, Press 1 if you want to encrypt.\nPress 2 if you want to decrypt.");
    answer = Number(prompt("Choice: "));
}
const passphrase = prompt("Please enter your passphrase: ");
if (answer === 1) {
    const seed = prompt("Please enter your seedphrase: ");
    const encrypt = AESEncryption.encrypt(seed, passphrase);
    console.log("Please save your encryption carefully or you won't be able to decrypt later: ", encrypt);
}
else if (answer === 2) {
    const cipherText = prompt("Please enter you cipher text: ");
    const iv = prompt("Please enter you iv: ");
    const salt = prompt("Please enter you salt: ");
    const tag = prompt("Please enter you tag: ");
    const encrypt = {
        cipherText,
        iv,
        salt,
        tag
    };
    const decrypt = AESEncryption.decrypt(encrypt, passphrase);
    console.log(decrypt);
}
