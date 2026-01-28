import PromptSync from "prompt-sync";
import { SeedManager } from "./core/seedManager.js";

const prompt = PromptSync();
console.log("🛡️  Welcome to SeedGuard - Secure Seed Phrase Manager\n");
console.log("Please select an option:");
console.log("  [1] Encrypt a seed phrase");
console.log("  [2] Decrypt a seed phrase\n");

let answer: number = Number(prompt("Your choice (1 or 2): "));
while(answer !== 1 && answer !== 2) {
    console.log("\n❌ Invalid choice. Please enter 1 or 2.");
    answer = Number(prompt("Your choice (1 or 2): "));
}
console.log();

const passphrase: string = prompt.hide("Enter your passphrase: ");

if (answer === 1) {
    console.log("\n📝 ENCRYPTION MODE");
    const seed: string = prompt("Enter your seed phrase: ");
    try {
        console.log("\n🔐 Encrypting your seed phrase...");
        const encryption = await SeedManager.secureSeed({ seed, passphrase });
        console.log("\n✅ Encryption successful!\n");
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.log("⚠️  IMPORTANT: Save this encrypted data securely");
        console.log("📋 COPY THE LINE BELOW (triple-click to select)");
        console.log(encryption);
        console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    } catch (error) {
        if (error instanceof Error) {
            console.error("❌ Error:", error.message);
        } else {
            console.error("❌ An unexpected error occurred");
        }
        process.exit(1);
    }   

} 
// else if (answer === 2) {
//     console.log("\n🔓 DECRYPTION MODE");
//     const encryptJson: string = prompt("Paste your encrypted JSON: ");
//     const encrypt = JSON.parse(encryptJson);
//     try {
//         console.log("\n🔐 Decrypting your seed phrase...");
//         const recoveredSeed = await SeedManager.recoverSeed(encrypt, passphrase);
        
//         console.log("\n✅ Decryption successful!\n");
//         console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
//         console.log("🔑 YOUR SEED PHRASE (keep it secret!)");
//         console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
//         console.log(recoveredSeed);
//         console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
//         console.log("⚠️  Never share your seed phrase with anyone!");
//         console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
    
//     } catch (parseError) {
//         console.error("❌ Invalid JSON format. Please check your encrypted data.");
//         process.exit(1);
//     }
// }

console.log("✅ Operation completed successfully!\n");
process.exit(0);