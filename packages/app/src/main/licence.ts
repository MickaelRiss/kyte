import { verify } from "crypto";

const PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEAysSG93pDLjmsnY88yDT/71WqBHA8jr2vqdiYh2T/YlA=
-----END PUBLIC KEY-----`;

// structure of the data inside a licence key
export interface LicencePayload {
  sub: string;
  fragment_limit: number;
  iat: number;
  exp: number;
}

// utility to decode licenceKey
function base64urlDecode(str: string): Buffer {
  // Replace URL-safe chars back to standard base64
  const base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  // Add padding if needed
  const padded = base64 + "==".slice(0, (4 - (base64.length % 4)) % 4);
  return Buffer.from(padded, "base64");
}

export function validateLicenceKey(
  key: string,
  publicKey: string = PUBLIC_KEY,
): LicencePayload {
  // Step 1: Split the key into 3 parts
  const parts = key.trim().split(".");

  if (parts.length !== 3) {
    throw new Error("Invalid licence key format");
  }

  const [headerB64, payloadB64, signatureB64] = parts;

  // Step 2: Verify the Ed25519 signature
  const signedContent = `${headerB64}.${payloadB64}`;
  const signature = base64urlDecode(signatureB64);

  // Ed25519 uses its own internal hash — pass null as the algorithm
  const isValid = verify(
    null,
    Buffer.from(signedContent),
    publicKey,
    signature,
  );

  if (!isValid) {
    throw new Error("Invalid licence key signature");
  }

  // Step 3: Decode the payload
  const payloadJson = base64urlDecode(payloadB64).toString("utf-8");
  let raw: unknown;

  try {
    raw = JSON.parse(payloadJson);
  } catch {
    throw new Error("Invalid licence key payload");
  }

  // Step 4: Validate payload shape before trusting any field
  if (
    typeof raw !== "object" ||
    raw === null ||
    typeof (raw as LicencePayload).sub !== "string" ||
    typeof (raw as LicencePayload).exp !== "number" ||
    typeof (raw as LicencePayload).iat !== "number" ||
    typeof (raw as LicencePayload).fragment_limit !== "number"
  ) {
    throw new Error("Invalid licence key payload structure");
  }

  const payload = raw as LicencePayload;

  // Step 5: Check expiration — reject missing, non-finite, or past exp
  const now = Math.floor(Date.now() / 1000); // Current time in Unix seconds

  if (!Number.isFinite(payload.exp)) {
    throw new Error("Invalid licence key: missing expiration");
  }
  if (payload.exp < now) {
    throw new Error("Licence key has expired");
  }

  return payload;
}
