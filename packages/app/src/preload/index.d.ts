import type { StoreState } from "../types/store";

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

declare global {
  interface Window {
    kyte: KyteAPI;
    store: StoreAPI;
  }
}
