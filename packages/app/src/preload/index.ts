import { contextBridge, ipcRenderer } from "electron";
import { electronAPI } from "@electron-toolkit/preload";
import { StoreState } from "../types/store";

export interface EncryptResult {
  fragmentA: { data: string; qr: string };
  fragmentB: { data: string; qr: string };
  fragmentC: { data: string; qr: string };
}

const kyteAPI = {
  encrypt: (seed: string, passphrase?: string): Promise<EncryptResult> =>
    ipcRenderer.invoke("seed:encrypt", seed, passphrase),

  decrypt: (fragments: string[], passphrase?: string): Promise<string> =>
    ipcRenderer.invoke("seed:decrypt", fragments, passphrase),
};

const store = {
  getState: (): Promise<StoreState> => ipcRenderer.invoke("store:get-state"),

  activateGuardian: (licenceKey: string): Promise<StoreState> =>
    ipcRenderer.invoke("store:activate-guardian", licenceKey),

  revokeGuardian: (): Promise<StoreState> =>
    ipcRenderer.invoke("store:revoke-guardian"),
};

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld("store", store);
    contextBridge.exposeInMainWorld("electron", electronAPI);
    contextBridge.exposeInMainWorld("kyte", kyteAPI);
  } catch (error) {
    console.error("Failed to expose APIs:", error);
  }
} else {
  throw new Error("contextIsolation must be enabled");
}
