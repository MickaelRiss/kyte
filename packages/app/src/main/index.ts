import { app, BrowserWindow, ipcMain } from "electron";
import { join } from "path";
import { is } from "@electron-toolkit/utils";
import { SeedManager, generateQR } from "kyte-core";

function createWindow(): BrowserWindow {
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      sandbox: false,
    },
  });

  if (is.dev && process.env["ELECTRON_RENDERER_URL"]) {
    mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  } else {
    mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
  }

  return mainWindow;
}

ipcMain.handle(
  "seed:encrypt",
  async (_event, seed: string, passphrase?: string) => {
    const fragments = await SeedManager.secureSeed({ seed, passphrase });
    const qrA = await generateQR(fragments[0]);
    const qrB = await generateQR(fragments[1]);
    const qrC = await generateQR(fragments[2]);
    return {
      fragmentA: { data: fragments[0], qr: qrA },
      fragmentB: { data: fragments[1], qr: qrB },
      fragmentC: { data: fragments[2], qr: qrC },
    };
  }
);

ipcMain.handle(
  "seed:decrypt",
  async (_event, fragments: string[], passphrase?: string) => {
    return await SeedManager.recoverSeed(fragments, passphrase);
  }
);

app.whenReady().then(() => {
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
