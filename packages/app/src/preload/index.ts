import { contextBridge, ipcRenderer } from "electron";
import { StoreState } from "../types/store";

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

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld("store", store);
    contextBridge.exposeInMainWorld("kyte", kyteAPI);
  } catch (error) {
    console.error("Failed to expose APIs:", error);
  }
} else {
  throw new Error("contextIsolation must be enabled");
}
