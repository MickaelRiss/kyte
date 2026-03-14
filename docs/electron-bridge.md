# Electron Bridge: IPC and contextBridge

## Overview

The renderer is fully sandboxed and has no direct access to Node.js APIs or `kyte-core`. All communication between the React UI and the main process goes through a strict three-layer model:

```
Renderer (React)                  ← sandboxed, no Node.js access
    window.kyte.encrypt(...)
           |
           ↓
Preload Script                    ← contextBridge.exposeInMainWorld()
    ipcRenderer.invoke('seed:encrypt', ...)
           |
           ↓
Main Process (Node.js)            ← full Node.js + kyte-core access
    ipcMain.handle('seed:encrypt', handler)
```

The preload script (`src/preload/index.ts`) is the only bridge. It runs in a privileged context with access to both `ipcRenderer` and `contextBridge`, and it exposes a controlled surface to the renderer as `window.kyte` and `window.store`.

## Preload Script (`src/preload/index.ts`)

```typescript
const kyteAPI = {
  encrypt: (
    seed: string,
    passphrase?: string,
    options?: { totalFragments?: number; threshold?: number },
  ): Promise<EncryptResult> =>
    ipcRenderer.invoke("seed:encrypt", seed, passphrase, options),

  decrypt: (fragments: string[], passphrase?: string): Promise<string> =>
    ipcRenderer.invoke("seed:decrypt", fragments, passphrase),

  testGuardianAlert: (botToken: string, chatId: string): Promise<void> =>
    ipcRenderer.invoke("guardian:test-alert", botToken, chatId),
};

const store = {
  getState: (): Promise<StoreState> => ipcRenderer.invoke("store:get-state"),
  activateGuardian: (licenceKey: string): Promise<StoreState> =>
    ipcRenderer.invoke("store:activate-guardian", licenceKey),
  revokeGuardian: (): Promise<StoreState> =>
    ipcRenderer.invoke("store:revoke-guardian"),
  openExternal: (url: string): Promise<void> =>
    ipcRenderer.invoke("app:open-external", url),
};

contextBridge.exposeInMainWorld("kyte", kyteAPI);
contextBridge.exposeInMainWorld("store", store);
```

The preload script throws if `contextIsolation` is not enabled — this is a hard requirement.

## Type Declarations (`src/preload/index.d.ts`)

These types are available globally in the renderer via the `declare global` block:

```typescript
export type EncryptResult = Array<{ data: string; qr: string }>;

export interface GuardianAlertConfig {
  botToken: string;
  chatId: string;
}

export interface GuardianOptions {
  totalFragments?: number;
  threshold?: number;
  guardianAlert?: GuardianAlertConfig;
}

interface KyteAPI {
  encrypt: (seed: string, passphrase?: string, options?: GuardianOptions) => Promise<EncryptResult>;
  decrypt: (fragments: string[], passphrase?: string) => Promise<string>;
  testGuardianAlert: (botToken: string, chatId: string) => Promise<void>;
}

interface StoreAPI {
  getState: () => Promise<StoreState>;
  activateGuardian: (licenceKey: string) => Promise<StoreState>;
  revokeGuardian: () => Promise<StoreState>;
  openExternal: (url: string) => Promise<void>;
}

// Window augmentation (global in renderer)
interface Window {
  electron: ElectronAPI;
  kyte: KyteAPI;
  store: StoreAPI;
}
```

`StoreState` is defined in `src/types/store.ts`:

```typescript
interface StoreState {
  tier: "free" | "guardian";
  status: null | "live" | "expired";
  encryption_count: number;
  has_licence_key: boolean;
}
```

## Complete IPC Channel Reference

| Channel | Renderer call | Input validation | Returns |
|---|---|---|---|
| `seed:encrypt` | `window.kyte.encrypt()` | BIP39 wordlist, quota check, seed len ≤ 1024, passphrase len ≤ 1024 | `EncryptResult` |
| `seed:decrypt` | `window.kyte.decrypt()` | Fragment count 2–10, fragment len ≤ 8192, passphrase len ≤ 1024 | `string` (seed) |
| `guardian:test-alert` | `window.kyte.testGuardianAlert()` | Bot token regex, chat ID regex, Guardian tier check | `void` |
| `store:get-state` | `window.store.getState()` | — | `StoreState` |
| `store:activate-guardian` | `window.store.activateGuardian()` | Key is string, len 1–512 | `StoreState` |
| `store:revoke-guardian` | `window.store.revokeGuardian()` | — | `StoreState` |
| `app:open-external` | `window.store.openExternal()` | Exact match against `https://kyte-beryl.vercel.app/` | `void` |

All handlers throw typed `Error` objects on validation failure; the message is forwarded to the renderer where React hooks strip the Electron IPC error prefix (see `src/renderer/src/utils/ipc.ts`).

## StoreService (`src/main/store.ts`)

`StoreService` manages the persistent encrypted state file `kyte-store.bin`.

**Persistence mechanism:**
- State is serialized to JSON, encrypted with `safeStorage.encryptString()`, and written to disk.
- On startup, the file is read, decrypted, and validated. Invalid or missing files initialize fresh state.
- The internal schema includes the raw license key; the public `StoreState` returned by `getState()` exposes only `has_licence_key: boolean`.

**Key methods:**

| Method | Description |
|---|---|
| `getState()` | Returns the public `StoreState` (no key material) |
| `tryConsumeEncryption()` | Decrements quota and persists; returns `null` if quota is 0 |
| `activateGuardian(key)` | Encrypts and stores the key, sets `tier="guardian"`, `status="live"`, `quota=10` |
| `revokeGuardian()` | Resets to `tier="free"`, `quota=1`, clears the license key |
| `setGuardianAlert(config \| null)` | Stores or clears the Telegram alert config (encrypted) |
| `getGuardianAlert()` | Returns the stored `GuardianAlertConfig` or `null` |

**Dev mode:** In development (`!app.isPackaged`), the constructor automatically sets Guardian tier so all features are testable without a license key.

## How to Add a New IPC Channel

Follow these four steps for any new operation:

**Step 1 — Main process** (`src/main/index.ts`):

```typescript
ipcMain.handle("channel:name", async (_event, arg1: unknown, arg2: unknown) => {
  // Validate all inputs (treat everything as `unknown`)
  // Perform the operation
  return result;
});
```

**Step 2 — Preload script** (`src/preload/index.ts`):

```typescript
// Add to kyteAPI or store object:
methodName: (arg1: string, arg2: number): Promise<ReturnType> =>
  ipcRenderer.invoke("channel:name", arg1, arg2),
```

**Step 3 — Type declarations** (`src/preload/index.d.ts`):

```typescript
// Add to KyteAPI or StoreAPI interface:
methodName: (arg1: string, arg2: number) => Promise<ReturnType>;
```

**Step 4 — Renderer** (React hook or component):

```typescript
const result = await window.kyte.methodName(arg1, arg2);
// or
const result = await window.store.methodName(arg1, arg2);
```

Never call `ipcRenderer` directly from the renderer — always go through the `window.kyte` or `window.store` surface.
