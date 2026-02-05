import { ElectronAPI } from "@electron-toolkit/preload";

export interface EncryptResult {
  fragmentA: { data: string; qr: string };
  fragmentB: { data: string; qr: string };
  fragmentC: { data: string; qr: string };
}

interface KyteAPI {
  encrypt: (seed: string, passphrase?: string) => Promise<EncryptResult>;
  decrypt: (fragments: string[], passphrase?: string) => Promise<string>;
}

declare global {
  interface Window {
    electron: ElectronAPI;
    kyte: KyteAPI;
  }
}
