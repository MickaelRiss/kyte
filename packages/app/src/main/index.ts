import { app, BrowserWindow, ipcMain, Menu } from "electron";
import { join } from "path";
import { is } from "@electron-toolkit/utils";
import { SeedManager, generateQR } from "kyte-core";
import { StoreService } from "./store";

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
    async (_event, seed: string, passphrase?: string) => {
      if (!is.dev && !storeService.tryConsumeEncryption()) {
        throw new Error(
          "Encryption quota exhausted. Upgrade to Guardian to continue.",
        );
      }
      const fragments = await SeedManager.secureSeed({ seed, passphrase });
      const [qrA, qrB, qrC] = await Promise.all([
        generateQR(fragments[0]),
        generateQR(fragments[1]),
        generateQR(fragments[2]),
      ]);
      return {
        fragmentA: { data: fragments[0], qr: qrA },
        fragmentB: { data: fragments[1], qr: qrB },
        fragmentC: { data: fragments[2], qr: qrC },
      };
    },
  );

  ipcMain.handle(
    "seed:decrypt",
    async (_event, fragments: string[], passphrase?: string) => {
      return await SeedManager.recoverSeed(fragments, passphrase);
    },
  );

  ipcMain.handle("store:get-state", () => {
    return storeService.getState();
  });

  ipcMain.handle("store:activate-guardian", (_event, licenceKey: string) => {
    return storeService.activateGuardian(licenceKey);
  });

  ipcMain.handle("store:revoke-guardian", () => {
    return storeService.revokeGuardian();
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
