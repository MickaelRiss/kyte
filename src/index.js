import PromptSync from "prompt-sync";
import { AESEncryption } from "../src/core/encryption.js";
// 1. Mettre en place le chiffrement AES avec un password ✅
// 2. Stringify le chiffrement AES
// 3. Implementer le Shamir Split pour 3 fragments et en jeter 1
// Objectif : 
// Créer les tests
const prompt = PromptSync();
let end = false;
while (end === false) {
    console.log("If you want to encrypt press: 1. If you want to decrypt press: 2.");
    let answer = prompt("Choice: ");
    const passphrase = prompt("Please enter your password: ");
    if (String(answer) === "1") {
        const seed = prompt("Please enter your seedphrase: ");
        const encrypt = AESEncryption.encrypt(seed, passphrase);
        console.log("Please save your encryption careful or you won't be able to decrypt later: ", encrypt);
        end = true;
    }
    else if (String(answer) === "2") {
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
        end = true;
    }
}
