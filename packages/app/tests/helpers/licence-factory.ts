import { generateKeyPairSync, sign } from "crypto";

function base64urlEncode(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function createTestKeyPair() {
  const { privateKey, publicKey } = generateKeyPairSync("ed25519", {
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
  });
  return { privateKey, publicKey };
}

export function buildToken(payload: object, privateKey: string): string {
  const header = base64urlEncode(Buffer.from(JSON.stringify({ alg: "EdDSA" })));
  const payloadB64 = base64urlEncode(Buffer.from(JSON.stringify(payload)));
  const signedContent = `${header}.${payloadB64}`;
  // Ed25519 uses its own internal hash — pass null as the algorithm
  const sig = base64urlEncode(sign(null, Buffer.from(signedContent), privateKey));
  return `${signedContent}.${sig}`;
}

/** Tamper helper: flip one byte in the signature segment */
export function tamperSignature(token: string): string {
  const [h, p, sig] = token.split(".");
  const bytes = Buffer.from(sig.replace(/-/g, "+").replace(/_/g, "/"), "base64");
  bytes[0] ^= 0xff;
  return `${h}.${p}.${base64urlEncode(bytes)}`;
}
