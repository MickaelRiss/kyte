# Kyte — Developer Overview

## What is Kyte?

Kyte is a desktop application for securing cryptocurrency seed phrases (BIP39 mnemonics). It combines optional AES-256-GCM passphrase encryption with Shamir secret sharing to split a seed into M-of-N fragments. Any subset of `threshold` fragments is sufficient to recover the original seed — no single fragment is sufficient on its own.

## Monorepo Structure

This repository is a **pnpm workspace** containing two packages:

```
packages/
├── core/    ← kyte-core: pure Node.js crypto library
│              (BIP39 validation, AES-256-GCM encryption, Shamir splitting, QR generation)
└── app/     ← kyte-app: Electron + React desktop application
               (UI, IPC bridge, license management, Telegram alerts)
```

`kyte-core` is a standalone library consumed by `kyte-app` as a `workspace:*` dependency. The core library has no awareness of Electron and can be used independently in any Node.js environment.

## Technology Stack

| Layer           | Technology                                    |
| --------------- | --------------------------------------------- |
| Runtime         | Node.js 22 (bundled with Electron 34)         |
| Desktop shell   | Electron 34                                   |
| Frontend        | React (via electron-vite)                     |
| Build tool      | electron-vite (Vite-based Electron bundler)   |
| Packaging       | electron-builder (DMG / NSIS / AppImage)      |
| Animations      | motion (Framer Motion v12)                    |
| Fonts           | IBM Plex Sans + IBM Plex Mono (`@fontsource`) |
| Test framework  | Vitest with Chai assertions                   |
| Package manager | pnpm (workspace)                              |
| Language        | TypeScript (strict mode, target `esnext`)     |

## Quick Start

```bash
# Install all workspace dependencies
pnpm install

# Start the Electron app in development mode (with HMR)
pnpm dev

# Run all tests
pnpm test

# Build all packages (core then app)
pnpm build

# Package the app for distribution (all platforms)
pnpm package
```

### Running a Single Test File

```bash
cd packages/core
pnpm vitest run tests/unit/encryption.test.ts
```

## Tiers

Kyte has two tiers that control feature availability:

| Tier         | Encryptions | Passphrase | M-of-N config                 | Telegram alerts |
| ------------ | ----------- | ---------- | ----------------------------- | --------------- |
| **Free**     | 1           | Disabled   | Fixed 3 fragments, 2-of-3     | No              |
| **Guardian** | 10          | Enabled    | 3–10 fragments, threshold 2–N | Yes             |

See [architecture.md](./architecture.md) for details on the tier system, security model, and cryptographic flow.
