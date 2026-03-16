import { sign } from "crypto";
import { describe, it, expect, beforeAll } from "vitest";
import { validateLicenceKey } from "../../src/main/licence.js";
import {
  createTestKeyPair,
  buildToken,
  tamperSignature,
} from "../helpers/licence-factory.js";

const now = Math.floor(Date.now() / 1000);
const future = now + 3600;
const past = now - 3600;

let privateKey: string;
let publicKey: string;
let altPrivateKey: string;

beforeAll(() => {
  ({ privateKey, publicKey } = createTestKeyPair());
  ({ privateKey: altPrivateKey } = createTestKeyPair());
});

function validPayload() {
  return { sub: "test-user", exp: future, iat: now, fragment_limit: 10 };
}

/** Sign a raw payload buffer (not JSON-serialised object) with the test private key. */
function signRawPayload(payloadBuf: Buffer): string {
  function b64url(buf: Buffer): string {
    return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }
  const header = b64url(Buffer.from(JSON.stringify({ alg: "EdDSA" })));
  const p = b64url(payloadBuf);
  const content = `${header}.${p}`;
  // Ed25519 uses its own internal hash — pass null as the algorithm
  const sig = b64url(sign(null, Buffer.from(content), privateKey));
  return `${content}.${sig}`;
}

// ---------------------------------------------------------------------------
// Format validation
// ---------------------------------------------------------------------------
describe("format validation", () => {
  it("throws on empty string (0 parts)", () => {
    expect(() => validateLicenceKey("", publicKey)).toThrow("Invalid licence key format");
  });

  it("throws on 2-part token", () => {
    expect(() => validateLicenceKey("aaa.bbb", publicKey)).toThrow(
      "Invalid licence key format",
    );
  });

  it("throws on 4-part token", () => {
    expect(() => validateLicenceKey("aaa.bbb.ccc.ddd", publicKey)).toThrow(
      "Invalid licence key format",
    );
  });
});

// ---------------------------------------------------------------------------
// Signature validation
// ---------------------------------------------------------------------------
describe("signature validation", () => {
  it("accepts a valid token", () => {
    const token = buildToken(validPayload(), privateKey);
    expect(() => validateLicenceKey(token, publicKey)).not.toThrow();
  });

  it("rejects a tampered payload", () => {
    const token = buildToken(validPayload(), privateKey);
    const [h, p, s] = token.split(".");
    const tamperedP = p.slice(0, -1) + (p.at(-1) === "A" ? "B" : "A");
    expect(() => validateLicenceKey(`${h}.${tamperedP}.${s}`, publicKey)).toThrow(
      "Invalid licence key signature",
    );
  });

  it("rejects a tampered signature", () => {
    const token = buildToken(validPayload(), privateKey);
    expect(() => validateLicenceKey(tamperSignature(token), publicKey)).toThrow(
      "Invalid licence key signature",
    );
  });

  it("rejects a signature from a different key pair", () => {
    const token = buildToken(validPayload(), altPrivateKey);
    expect(() => validateLicenceKey(token, publicKey)).toThrow(
      "Invalid licence key signature",
    );
  });
});

// ---------------------------------------------------------------------------
// Payload structure validation
// ---------------------------------------------------------------------------
describe("payload structure validation", () => {
  it("rejects non-JSON payload bytes", () => {
    const token = signRawPayload(Buffer.from("not json at all!!!"));
    expect(() => validateLicenceKey(token, publicKey)).toThrow(
      "Invalid licence key payload",
    );
  });

  it("rejects empty object {}", () => {
    const token = buildToken({}, privateKey);
    expect(() => validateLicenceKey(token, publicKey)).toThrow(
      "Invalid licence key payload structure",
    );
  });

  it("rejects missing sub", () => {
    const { sub: _sub, ...noSub } = validPayload();
    const token = buildToken(noSub, privateKey);
    expect(() => validateLicenceKey(token, publicKey)).toThrow(
      "Invalid licence key payload structure",
    );
  });

  it("rejects missing exp", () => {
    const { exp: _exp, ...noExp } = validPayload();
    const token = buildToken(noExp, privateKey);
    expect(() => validateLicenceKey(token, publicKey)).toThrow(
      "Invalid licence key payload structure",
    );
  });

  it("rejects exp as string", () => {
    const token = buildToken({ ...validPayload(), exp: "never" }, privateKey);
    expect(() => validateLicenceKey(token, publicKey)).toThrow(
      "Invalid licence key payload structure",
    );
  });

  it("rejects missing iat", () => {
    const { iat: _iat, ...noIat } = validPayload();
    const token = buildToken(noIat, privateKey);
    expect(() => validateLicenceKey(token, publicKey)).toThrow(
      "Invalid licence key payload structure",
    );
  });

  it("rejects missing fragment_limit", () => {
    const { fragment_limit: _fl, ...noFl } = validPayload();
    const token = buildToken(noFl, privateKey);
    expect(() => validateLicenceKey(token, publicKey)).toThrow(
      "Invalid licence key payload structure",
    );
  });
});

// ---------------------------------------------------------------------------
// Expiration validation
// ---------------------------------------------------------------------------
describe("expiration validation", () => {
  it("rejects exp in the past", () => {
    const token = buildToken({ ...validPayload(), exp: past }, privateKey);
    expect(() => validateLicenceKey(token, publicKey)).toThrow("Licence key has expired");
  });

  it("rejects exp = 0", () => {
    const token = buildToken({ ...validPayload(), exp: 0 }, privateKey);
    expect(() => validateLicenceKey(token, publicKey)).toThrow("Licence key has expired");
  });

  it("rejects exp = Infinity (encoded as 1e309 — overflows to Infinity on parse)", () => {
    // JSON.parse('{"exp": 1e309}') yields { exp: Infinity } in Node.js — the
    // number literal overflows double precision and becomes Infinity.
    const rawJson = `{"sub":"test","exp":1e309,"iat":${now},"fragment_limit":10}`;
    const token = signRawPayload(Buffer.from(rawJson));
    expect(() => validateLicenceKey(token, publicKey)).toThrow(
      "Invalid licence key: missing expiration",
    );
  });

  it("accepts exp 1 hour in the future", () => {
    const token = buildToken(validPayload(), privateKey);
    expect(() => validateLicenceKey(token, publicKey)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Return value shape
// ---------------------------------------------------------------------------
describe("return value shape", () => {
  it("returns the full payload with correct field values", () => {
    const payload = validPayload();
    const token = buildToken(payload, privateKey);
    const result = validateLicenceKey(token, publicKey);
    expect(result.sub).toBe(payload.sub);
    expect(result.exp).toBe(payload.exp);
    expect(result.iat).toBe(payload.iat);
    expect(result.fragment_limit).toBe(payload.fragment_limit);
  });
});
