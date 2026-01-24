import PromptSync from "prompt-sync";
import { EncryptedSeed, AESEncryption } from "../src/core/encryption.js"

// 1. Mettre en place le chiffrement AES avec un password ✅
// 2. Stringify le chiffrement AES
// 3. Implementer le Shamir Split pour 3 fragments et en jeter 1


// Objectif : 
// Créer les tests

const prompt = PromptSync();
let end = false;

while (end === false) {
    console.log("If you want to encrypt press: 1. If you want to decrypt press: 2.")
    let answer: string = prompt("Choice: ");
    const passphrase: string = prompt("Please enter your password: ");

    if (String(answer) === "1") {
        const seed: string = prompt("Please enter your seedphrase: ");
        const encrypt: EncryptedSeed = AESEncryption.encrypt(seed, passphrase);
        console.log("Please save your encryption careful or you won't be able to decrypt later: ", encrypt);
        end = true;        
    } else if (String(answer) === "2") {
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
        end = true;
    }
}