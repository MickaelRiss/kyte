# Feature Walkthroughs

## Feature 1: Seed Encryption

### End-to-End Flow

1. User fills the encrypt form: seed phrase input, optional passphrase, optional M-of-N steppers (Guardian only), optional Telegram alert toggle with bot token and chat ID.

2. `useEncrypt.handleEncrypt()` calls:
   ```typescript
   window.kyte.encrypt(seed, passphrase?, options?)
   // options: { totalFragments?, threshold?, guardianAlert?: { botToken, chatId } }
   ```

3. Preload forwards to main via `ipcRenderer.invoke("seed:encrypt", seed, passphrase, options)`.

4. Main process validates inputs:
   - Seed must be a non-empty string, length ≤ 1024
   - Passphrase (if provided) must be a string, length ≤ 1024
   - `SeedValidator.normalizeSeed()` then `SeedValidator.validateSeed()` — throws on invalid BIP39
   - `storeService.tryConsumeEncryption()` — throws if quota is exhausted

5. M-of-N parameters are resolved:
   - Guardian tier: `totalFragments` clamped to [3, 10], `threshold` clamped to [2, totalFragments]
   - Free tier: forced to `totalFragments=3`, `threshold=2`
   - Guardian alert config validated (bot token regex + chat ID regex) and stored via `storeService.setGuardianAlert()`

6. `SeedManager.secureSeed({ seed, passphrase, totalFragments, threshold })` runs the full crypto pipeline (AES if passphrase, then Shamir split).

7. `generateQR(fragment)` is called for each fragment in parallel, producing PNG data URLs.

8. Handler returns `Array<{ data: string; qr: string }>` to the renderer.

9. `useEncrypt` clears all form inputs after a successful response, then renders fragment cards labeled A, B, C…

### Fragment Label Convention

Fragments are labeled alphabetically (A, B, C…) in the UI. The underlying `i` field in the JSON is 1-indexed and matches the label position.

---

## Feature 2: Seed Recovery

### End-to-End Flow

1. User adds fragment strings (paste or type) into the decrypt form, plus an optional passphrase.

2. `useDecrypt` parses the first fragment's JSON on every change to extract `threshold` and `total`, displaying a hint such as "Provide any 2 of 3 fragments."

3. `handleDecrypt()` calls:
   ```typescript
   window.kyte.decrypt(fragments, passphrase?)
   ```

4. Main process validates:
   - `fragments` must be an array, length 2–10
   - Each fragment must be a non-empty string, length ≤ 8192
   - Passphrase (if provided) must be a string, length ≤ 1024

5. `SeedManager.recoverSeed(fragments, passphrase?)`:
   - Parses each fragment JSON, verifies all share the same `threshold` and `bid`
   - `ShamirSecret.combine()` reconstructs the original data
   - If passphrase: AES-256-GCM decryption
   - Final BIP39 validation before returning

6. If Guardian tier + stored alert config: `fetchGeoLocation()` is called, then `sendTelegramAlert()` fires asynchronously. The seed is returned to the renderer immediately without waiting for the alert.

7. Recovered seed is displayed in the renderer and **auto-cleared after 30 seconds** by a `setTimeout` in `useDecrypt`.

---

## Feature 3: Guardian Tier

### Activation

1. User enters a license key in the Guardian settings panel.
2. `window.store.activateGuardian(licenceKey)` → `store:activate-guardian`
3. Main validates: key must be a non-empty string, length ≤ 512.
4. `storeService.activateGuardian(key)`:
   - Encrypts the key with `safeStorage.encryptString()`
   - Sets `tier = "guardian"`, `status = "live"`, `encryption_count = 10`
   - Persists to `kyte-store.bin`
5. Returns updated `StoreState` → `useStore` refreshes → UI unlocks Guardian features.

### Revocation

`window.store.revokeGuardian()` → `store:revoke-guardian` → resets `tier = "free"`, `encryption_count = 1`, clears the stored license key. Returns updated `StoreState`.

### UI Changes on Guardian Tier

- Passphrase input field enabled
- Fragment count stepper (3–10) and threshold stepper (2–N) become visible
- Telegram alert toggle and fields (bot token, chat ID) shown
- Encryption quota displays remaining count out of 10

---

## Feature 4: Telegram Guardian Alerts

### Setup

1. User enables the "Telegram notification on recovery" toggle in the encrypt form.
2. User provides a bot token and chat ID, then optionally clicks "Test Alert."
3. Test alert: `window.kyte.testGuardianAlert(botToken, chatId)` → `guardian:test-alert`
   - Main validates bot token and chat ID format
   - Verifies Guardian tier is active
   - Calls `fetchGeoLocation()` synchronously (awaited)
   - Sends a test message via the Telegram Bot API
4. The UI shows sending / success / error states based on the resolved promise.

### Validation

| Field | Regex |
|---|---|
| Bot token | `/^\d{5,16}:[A-Za-z0-9_-]{35}$/` |
| Chat ID | `/^-?\d{1,20}$/` (negative values supported for group chats) |

### On Every Recovery (Guardian Tier)

1. `seed:decrypt` handler returns the recovered seed to the renderer.
2. After the return, asynchronously:
   - `storeService.getGuardianAlert()` retrieves the stored config
   - If config present and tier is `guardian` + `live`: `fetchGeoLocation()` is awaited
   - `sendTelegramAlert(alertConfig, location)` sends the message

### Alert Message Format

```
⚠️ Your seed phrase was recovered.
📍 Approximate location (based on IP address):
   City, Region, Country
🌐 ISP: [provider name]
🗺 https://maps.google.com/?q=lat,lon
🕐 [UTC timestamp]

⚠️ This location is approximate and may reflect the ISP's routing center,
   not the exact device position.

If this wasn't you, contact me immediately.
```

The test alert uses the same format but prefixed with `✅ Kyte Guardian Alert test successful.`

---

## Feature 5: IP Geolocation

### Purpose

Geolocation is used exclusively to enrich Telegram alert messages with an approximate device location. The data is never stored, never shown to the user in the UI, and never sent to any server other than Telegram.

### Provider Chain

Kyte tries two providers in sequence. If the first fails or returns incomplete data, the second is tried. If both fail, `null` is returned and the alert message shows "Unknown location."

**Primary:** `https://ipapi.co/json/`

| API field | Mapped to |
|---|---|
| `city` | `city` |
| `region` | `region` |
| `country_name` | `country` |
| `org` | `isp` |
| `latitude` | `lat` |
| `longitude` | `lon` |

**Fallback:** `http://ip-api.com/json/?fields=city,regionName,country,isp,lat,lon`

| API field | Mapped to |
|---|---|
| `city` | `city` |
| `regionName` | `region` |
| `country` | `country` |
| `isp` | `isp` |
| `lat` | `lat` |
| `lon` | `lon` |

### Implementation Details

Both providers share `fetchGeoProvider()`:

- **Timeout:** 5 seconds via `AbortController`
- **User-Agent:** `Kyte/1.0` header — required by `ipapi.co` (Node.js 22 built-in `fetch` omits it by default)
- **Error handling:** HTTP errors and incomplete responses are logged to `console.error`; the function returns `null`

Data safety:

- `toFiniteNumber(v, fallback)` — converts to `Number`, returns fallback if `NaN` or `Infinity`
- Latitude clamped to `[-90, 90]`, longitude to `[-180, 180]` before inserting into the Maps URL
- `sanitizeLocationField(s)` — strips ASCII control characters (0x00–0x1F, 0x7F), trims, limits to 100 characters
