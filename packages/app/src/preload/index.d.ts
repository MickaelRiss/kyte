import { ElectronAPI } from "@electron-toolkit/preload";

export type EncryptResult = Array<{ data: string; qr: string }>;

export interface GuardianOptions {
  totalFragments?: number;
  threshold?: number;
}

interface KyteAPI {
  encrypt: (seed: string, passphrase?: string, options?: GuardianOptions) => Promise<EncryptResult>;
  decrypt: (fragments: string[], passphrase?: string) => Promise<string>;
}

declare global {
  interface Window {
    electron: ElectronAPI;
    kyte: KyteAPI;
  }
}
