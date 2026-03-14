# kyte-core Library

## Package Overview

`kyte-core` (`packages/core/`) is a pure Node.js ES module library. It uses the built-in `node:crypto` module for all cryptographic primitives — it is **not browser-safe**. The package compiles to `packages/core/dist/` with full TypeScript declarations (`.d.ts`).

Public API is exported from `packages/core/src/index.ts`. All internal modules are considered private.

## Public API Reference

### `SeedManager.secureSeed(options)`

```typescript
interface UserInformations {
  seed: string;            // BIP39 mnemonic (12–24 words)
  passphrase?: string;     // Optional. Absent = Community mode (Shamir only)
  totalFragments?: number; // 3–10, default 3
  threshold?: number;      // 2–totalFragments, default 2
}

SeedManager.secureSeed(options: UserInformations): Promise<string[]>
```

Returns an array of JSON fragment strings. Each string has this shape:

```json
{
  "i": 1,
  "data": "<hex-encoded Shamir share>",
  "threshold": 2,
  "total": 3,
  "bid": "<32-char hex backup ID>"
}
```

Note: `secureSeed` re-validates the seed internally. The caller (main process) also validates before calling, so validation runs twice as a defense-in-depth measure.

### `SeedManager.recoverSeed(fragments, passphrase?)`

```typescript
SeedManager.recoverSeed(
  fragments: string[],  // JSON fragment strings (minimum `threshold` required)
  passphrase?: string,  // Required if seed was encrypted with a passphrase
): Promise<string>      // Returns the normalized BIP39 mnemonic
```

Throws if:
- Any fragment has an invalid JSON format
- Fragments have inconsistent `threshold` values
- Fragments have different `bid` values (cross-backup mixing)
- AES decryption fails (wrong passphrase or tampered ciphertext)
- The recovered seed is not a valid BIP39 mnemonic

### `SeedValidator`

```typescript
SeedValidator.validateSeed(seed: string): boolean
// Returns true if every word is in the BIP39 wordlist and word count is 12, 15, 18, 21, or 24.

SeedValidator.normalizeSeed(seed: string): string
// Trims leading/trailing whitespace and lowercases the entire string.
```

### `generateQR(data)`

```typescript
generateQR(data: string): Promise<string>
// Returns a PNG data URL (base64-encoded).
```

## Encryption Module (`src/core/encryption.ts`)

| Parameter | Value |
|---|---|
| Algorithm | AES-256-GCM |
| Key derivation | PBKDF2-HMAC-SHA512 |
| Iterations | 210,000 (current) / 100,000 (legacy fallback) |
| Salt | 64 bytes, random per encryption |
| IV | 12 bytes, random per encryption |
| Output | `EncryptedSeed` object |

```typescript
interface EncryptedSeed {
  cipherText: string;  // hex
  iv: string;          // hex, 12 bytes
  salt: string;        // hex, 64 bytes
  tag: string;         // hex, GCM authentication tag
  iterations?: number; // omitted in legacy data (treated as 100,000 on decrypt)
}
```

The derived key buffer is zeroed immediately after use (`key.fill(0)`). The GCM authentication tag is verified during decryption — any modification to the ciphertext causes an immediate throw before any plaintext is returned.

**Legacy compatibility:** If `EncryptedSeed.iterations` is absent (data encrypted before the iteration count was stored), decryption defaults to 100,000 iterations. Do not remove this fallback — it is the only way to recover older seeds.

## Shamir Module (`src/core/shamir.ts`)

Wraps the `shamir-secret-sharing` npm package with input validation and a typed interface.

```typescript
ShamirSecret.split(
  data: string,
  totalFragments?: number,  // 3–10, default 3
  threshold?: number,        // 2–totalFragments, default 2
): Promise<{ fragments: string[]; threshold: number; total: number }>

ShamirSecret.combine(
  hexShares: string[],  // At least `threshold` shares
  threshold: number,
): Promise<string>
```

Constraints enforced at runtime:
- `totalFragments` must be between 3 and 10 (inclusive)
- `threshold` must be between 2 and `totalFragments` (inclusive)

Fragment data is hex-encoded. Any `threshold` of the `total` fragments is sufficient to reconstruct the original data; fewer than `threshold` fragments reveal nothing about the secret.

## Test Structure

```
packages/core/tests/
├── unit/
│   ├── encryption.test.ts   ← AES encrypt/decrypt, wrong passphrase, legacy iterations
│   ├── shamir.test.ts       ← split/combine, threshold enforcement, invalid inputs
│   └── validator.test.ts    ← BIP39 word count, invalid words, normalization
└── integration/
    └── seedManager.test.ts  ← Full pipeline: all BIP39 sizes (128–256 bits),
                                all M-of-N configs, cross-backup mixing detection,
                                Community mode (no passphrase)
```

All tests use Vitest with Chai `expect()` assertions. Parameterized cases use `.each()`.

```bash
# Run all core tests
cd packages/core && pnpm vitest run

# Run a specific test file
cd packages/core && pnpm vitest run tests/unit/encryption.test.ts

# Watch mode
cd packages/core && pnpm vitest
```
