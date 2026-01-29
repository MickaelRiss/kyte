import PromptSync from "prompt-sync";
import { SeedManager } from "./core/seedManager.js";
import { generateQR } from "./utils/qrcode.js";
import { buildPDF } from "./utils/pdf.js";

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

        const [fragmentA, fragmentB, fragmentC] = encryption;

        // Fragment A to QR code in PDF
        const qrA = await generateQR(fragmentA);
        const pathA = await buildPDF(qrA, "./seedguard_fragmentA.pdf", "Fragment A");
        console.log(`📄 Fragment A saved to ${pathA}`);

        // Fragment B to QR code in PDF
        const qrB = await generateQR(fragmentB);
        const pathB = await buildPDF(qrB, "./seedguard_fragmentB.pdf", "Fragment B");
        console.log(`📄 Fragment B saved to ${pathB}`);

        // Fragment C (to be uploaded to smart contract)
        console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.log("📋 Fragment C (for smart contract upload):");
        console.log(fragmentC);
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    } catch (error) {
        if (error instanceof Error) {
            console.error("❌ Error:", error.message);
        } else {
            console.error("❌ An unexpected error occurred");
        }
        process.exit(1);
    }   

}
// Decryption mode will be implemented in the UI layer (file upload or manual paste)

console.log("✅ Operation completed successfully!\n");
process.exit(0);