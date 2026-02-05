import { contextBridge, ipcRenderer } from "electron";
import { electronAPI } from "@electron-toolkit/preload";

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

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld("electron", electronAPI);
    contextBridge.exposeInMainWorld("kyte", kyteAPI);
  } catch (error) {
    console.error("Failed to expose APIs:", error);
  }
} else {
  // @ts-expect-error fallback for non-isolated context
  window.electron = electronAPI;
  // @ts-expect-error fallback for non-isolated context
  window.kyte = kyteAPI;
}
