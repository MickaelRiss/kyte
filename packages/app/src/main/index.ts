import { app, BrowserWindow, ipcMain, Menu, shell } from "electron";
import { join } from "path";
import { is } from "@electron-toolkit/utils";
import { SeedManager, generateQR } from "kyte-core";
import { StoreService } from "./store";
import { MAX_FRAGMENTS, MAX_FRAGMENT_LENGTH } from "../constants.js";

const ALLOWED_EXTERNAL_URL = "https://kyte-beryl.vercel.app/";

function toSafeInt(value: unknown, fallback: number, min: number, max: number): number {
  const n = Number(value);
  if (!Number.isInteger(n) || n < min || n > max) return fallback;
  return n;
}

function createWindow(): BrowserWindow {
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (is.dev && process.env["ELECTRON_RENDERER_URL"]) {
    mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  } else {
    mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
  }

  return mainWindow;
}

app.whenReady().then(() => {
  const storeService = new StoreService();

  ipcMain.handle(
    "seed:encrypt",
    async (
      _event,
      seed: unknown,
      passphrase?: unknown,
      options?: unknown,
    ) => {
      if (typeof seed !== "string" || seed.length === 0 || seed.length > 1024) {
        throw new Error("Invalid seed input.");
      }
      if (passphrase !== undefined && (typeof passphrase !== "string" || passphrase.length > 1024)) {
        throw new Error("Invalid passphrase.");
      }

      const state = storeService.tryConsumeEncryption();
      if (!state) {
        throw new Error(
          "Encryption quota exhausted. Upgrade to Guardian to continue.",
        );
      }
      const isGuardian = state.tier === "guardian" && state.status === "live";
      const opts = options !== null && typeof options === "object" ? options as Record<string, unknown> : {};

      const totalFragments = isGuardian ? toSafeInt(opts.totalFragments, 3, 3, 10) : 3;
      const threshold = isGuardian ? toSafeInt(opts.threshold, 2, 2, totalFragments) : 2;

      const fragments = await SeedManager.secureSeed({
        seed,
        passphrase: passphrase as string | undefined,
        totalFragments,
        threshold,
      });

      const qrCodes = await Promise.all(fragments.map((f) => generateQR(f)));

      return fragments.map((data, i) => ({ data, qr: qrCodes[i] }));
    },
  );

  ipcMain.handle(
    "seed:decrypt",
    async (_event, fragments: unknown, passphrase?: unknown) => {
      if (!Array.isArray(fragments) || fragments.length < 2 || fragments.length > MAX_FRAGMENTS) {
        throw new Error("Invalid fragments input.");
      }
      for (const f of fragments) {
        if (typeof f !== "string" || f.length === 0 || f.length > MAX_FRAGMENT_LENGTH) {
          throw new Error("Invalid fragment value.");
        }
      }
      if (passphrase !== undefined && (typeof passphrase !== "string" || passphrase.length > 1024)) {
        throw new Error("Invalid passphrase.");
      }
      return await SeedManager.recoverSeed(fragments, passphrase as string | undefined);
    },
  );

  ipcMain.handle("store:get-state", () => {
    return storeService.getState();
  });

  ipcMain.handle("store:activate-guardian", (_event, licenceKey: unknown) => {
    if (typeof licenceKey !== "string" || licenceKey.length === 0 || licenceKey.length > 512) {
      throw new Error("Invalid licence key.");
    }
    return storeService.activateGuardian(licenceKey);
  });

  ipcMain.handle("store:revoke-guardian", () => {
    return storeService.revokeGuardian();
  });

  ipcMain.handle("app:open-external", (_event, url: unknown) => {
    if (typeof url !== "string" || url !== ALLOWED_EXTERNAL_URL) return;
    return shell.openExternal(url);
  });

  if (!is.dev) {
    Menu.setApplicationMenu(null);
  }
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
