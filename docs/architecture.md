# Architecture

## High-Level Architecture

Kyte uses Electron's three-layer model to keep all cryptographic operations in the Node.js main process, away from the sandboxed renderer:

```
Renderer (React)
     |  window.kyte.*  /  window.store.*
     |  (contextBridge — no direct Node.js access)
     ↓
Preload Script  (src/preload/index.ts)
     |  ipcRenderer.invoke(channel, ...args)
     ↓
Main Process  (src/main/index.ts)  — Node.js, full system access
     ├── kyte-core          (crypto: AES, Shamir, BIP39 validation)
     └── StoreService       (license tier, quota, safeStorage persistence)
```

The renderer is fully sandboxed (`sandbox: true`, `nodeIntegration: false`, `contextIsolation: true`). It can only call the explicit APIs exposed through `contextBridge`.

## Core Cryptographic Flow

### Encryption

1. User provides a BIP39 mnemonic (12–24 words) and an optional passphrase.
2. `SeedValidator.normalizeSeed(seed)` — trims whitespace and lowercases the input.
3. `SeedValidator.validateSeed(normalized)` — checks every word against the BIP39 wordlist; throws on failure.
4. **If passphrase provided:** `AESEncryption.encrypt(seed, passphrase)` produces an `EncryptedSeed` object:
   - Key derivation: PBKDF2-HMAC-SHA512, 210,000 iterations, 64-byte random salt
   - Cipher: AES-256-GCM with a 12-byte random IV
   - Output includes `cipherText`, `iv`, `salt`, `tag`, and `iterations`
   - The raw key buffer is zeroed immediately after use
5. **If no passphrase (Community mode):** the normalized seed string is split directly.
6. `ShamirSecret.split(data, totalFragments, threshold)` — splits into M-of-N hex-encoded shares.
7. A 16-byte random backup ID (`bid`) is generated and embedded in every fragment's JSON envelope.
8. `generateQR(fragment)` produces a PNG data URL for each fragment.
9. Fragments returned as `Array<{ data: string; qr: string }>`.

### Recovery (reverse flow)

1. User provides `threshold` or more fragment strings and an optional passphrase.
2. Each fragment JSON is parsed; `threshold` and `bid` fields are extracted.
3. Validation: all fragments must share the same `threshold` and the same `bid` — mismatches throw immediately (cross-backup mixing protection).
4. `ShamirSecret.combine(hexShares, threshold)` — reconstructs the original data string.
5. **If passphrase provided:** the combined data is parsed as `EncryptedSeed` and decrypted with AES-256-GCM.
6. **If no passphrase:** the combined data is treated as the raw seed.
7. The recovered seed is normalized and re-validated against the BIP39 wordlist before being returned.
8. If Guardian tier + alert config is stored, `fetchGeoLocation()` + `sendTelegramAlert()` are fired asynchronously (does not block the seed return).

## Tier System

| Feature | Free | Guardian |
|---|---|---|
| Encryptions | 1 | 10 |
| Passphrase (AES) | No | Yes |
| M-of-N config | Fixed 3 fragments, 2-of-3 | 3–10 fragments, threshold 2–N |
| Telegram recovery alerts | No | Yes |
| License key required | No | Yes |

Tier state and encryption quota are persisted in `kyte-store.bin` via Electron `safeStorage`. In development mode (`!app.isPackaged`), Guardian tier is set automatically — no license key is needed.

## Security Model

| Property | Implementation |
|---|---|
| Crypto isolation | All crypto runs in the main process (Node.js). The renderer never imports `kyte-core`. |
| Renderer sandbox | `sandbox: true`, `nodeIntegration: false`, `contextIsolation: true` |
| Secret storage | License key and Telegram alert config encrypted with `safeStorage.encryptString()`, written to `kyte-store.bin` |
| Renderer exposure | `StoreState` exposes only `has_licence_key: boolean` — the key itself never reaches the renderer |
| Auto-clear | Recovered seed displayed in the renderer is cleared automatically after 30 seconds |
| Cross-backup protection | Backup ID (`bid`) embedded in every fragment; recovery rejects fragments with mismatched `bid` values |

## Key Design Decisions

- **PBKDF2 at 210,000 iterations** — OWASP 2023 recommendation for HMAC-SHA512.
- **Legacy decryption support** — `EncryptedSeed.iterations` is optional; if absent, decryption falls back to 100,000 iterations to support seeds encrypted before the iteration count was raised.
- **GCM authentication tag** — AES-256-GCM produces an authentication tag that detects any modification to the ciphertext before decryption proceeds.
- **All fragments retained** — no fragment is discarded after splitting. Users choose how to distribute them.
- **Guardian alert is asynchronous** — the Telegram alert does not block seed recovery. Failures are logged to the console only.
- **Dev mode shortcut** — Guardian tier is auto-enabled when the app is not packaged, allowing full feature testing without a license key.
