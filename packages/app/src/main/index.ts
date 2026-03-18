import { app, BrowserWindow, ipcMain, Menu, shell } from "electron";
import { join } from "path";
import { is } from "@electron-toolkit/utils";
import { SeedManager, SeedValidator, generateQR } from "kyte-core";
import { StoreService, type GuardianAlertConfig } from "./store";
import { validateLicenceKey } from "./licence.js";
import { MAX_FRAGMENTS, MAX_FRAGMENT_LENGTH } from "../constants.js";

const ALLOWED_EXTERNAL_URLS = new Set([
  "https://kytesec.com/#plans",
  "https://billing.stripe.com/p/login/test_00w5kDc158PWa1edO92cg00",
]);
const LICENCE_VERIFY_URL = "https://kytesec.com/api/verify-licence";
const TELEGRAM_TOKEN_RE = /^\d{5,16}:[A-Za-z0-9_-]{35}$/;
const TELEGRAM_CHAT_ID_RE = /^-?\d{1,20}$/;

function isValidBotToken(v: unknown): v is string {
  return typeof v === "string" && TELEGRAM_TOKEN_RE.test(v);
}

function isValidChatId(v: unknown): v is string {
  return typeof v === "string" && TELEGRAM_CHAT_ID_RE.test(v);
}

function toSafeInt(
  value: unknown,
  fallback: number,
  min: number,
  max: number,
): number {
  const n = Number(value);
  if (!Number.isInteger(n) || n < min || n > max) return fallback;
  return n;
}

function toGuardianAlert(
  opts: Record<string, unknown>,
): GuardianAlertConfig | undefined {
  const { guardianAlert } = opts;
  if (!guardianAlert || typeof guardianAlert !== "object") return undefined;
  const ga = guardianAlert as Record<string, unknown>;
  if (!isValidBotToken(ga.botToken) || !isValidChatId(ga.chatId))
    return undefined;
  return { botToken: ga.botToken, chatId: ga.chatId };
}

type LocationInfo = {
  city: string;
  region: string;
  country: string;
  isp: string;
  lat: number;
  lon: number;
} | null;

async function fetchGeoProvider(
  url: string,
  label: string,
  mapper: (data: Record<string, unknown>) => LocationInfo,
): Promise<LocationInfo> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "Kyte/1.0" },
    });
    if (!response.ok) {
      console.error(
        `Geolocation API (${label}) error: HTTP ${response.status}`,
      );
      return null;
    }
    const data = (await response.json()) as Record<string, unknown>;
    const result = mapper(data);
    if (!result) {
      console.error(
        `Geolocation API (${label}) returned incomplete data:`,
        JSON.stringify(data),
      );
    }
    return result;
  } catch (err) {
    console.error(`Geolocation fetch (${label}) failed:`, err);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function fetchFromIpApiCo(): Promise<LocationInfo> {
  return fetchGeoProvider("https://ipapi.co/json/", "ipapi.co", (data) => {
    if (!data.city || !data.country_name) return null;
    return {
      city: data.city as string,
      region: (data.region as string) ?? "",
      country: data.country_name as string,
      isp: (data.org as string) ?? "",
      lat: toFiniteNumber(data.latitude, 0),
      lon: toFiniteNumber(data.longitude, 0),
    };
  });
}

async function fetchGeoLocation(): Promise<LocationInfo> {
  return fetchFromIpApiCo();
}

function toFiniteNumber(v: unknown, fallback: number): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function sanitizeLocationField(s: string): string {
  return s
    .replace(/[\x00-\x1F\x7F]/g, " ")
    .trim()
    .slice(0, 100);
}

function formatLocation(location: LocationInfo): string {
  if (!location) return "Unknown location";
  const city = sanitizeLocationField(location.city);
  const region = sanitizeLocationField(location.region);
  const country = sanitizeLocationField(location.country);
  const isp = sanitizeLocationField(location.isp);
  const lat = Math.max(-90, Math.min(90, location.lat));
  const lon = Math.max(-180, Math.min(180, location.lon));
  return `Approximate location (based on IP address):\n   ${city}, ${region}, ${country}\n🌐 ISP: ${isp}\n🗺 https://maps.google.com/?q=${lat},${lon}`;
}

async function sendTelegramMessage(
  botToken: string,
  chatId: string,
  text: string,
): Promise<void> {
  const response = await fetch(
    `https://api.telegram.org/bot${botToken}/sendMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text }),
    },
  );
  if (!response.ok) {
    const data = (await response.json()) as { description?: string };
    throw new Error(data.description ?? "Telegram API error");
  }
}

function sendTelegramAlert(
  alert: GuardianAlertConfig,
  location: LocationInfo,
): void {
  const locationStr = formatLocation(location);
  const timestamp = new Date().toUTCString();
  const message = `⚠️ Your seed phrase was recovered.\n📍 ${locationStr}\n🕐 ${timestamp}\n\n⚠️ This location is approximate and may reflect the ISP's routing center, not the exact device position.\n\nIf this wasn't you, contact me immediately.`;
  sendTelegramMessage(alert.botToken, alert.chatId, message).catch((err) =>
    console.error("Telegram alert failed:", err),
  );
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

  // Check stored licence validity on launch (local, instant)
  const currentState = storeService.checkLicenceOnLaunch();

  // Background refresh: ask server if subscription is still active
  if (currentState.has_licence_key && currentState.tier === "guardian") {
    (async () => {
      try {
        // Read the stored encrypted key to send to the server
        const licenceKey = storeService.getDecryptedLicenceKey();
        if (!licenceKey) return;

        const deviceId = storeService.getOrCreateDeviceId();
        const response = await fetch(LICENCE_VERIFY_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ licence_key: licenceKey, device_id: deviceId }),
          signal: AbortSignal.timeout(10000),
        });

        if (!response.ok) {
          // Server says subscription is no longer active or device mismatch
          if (response.status === 403 || response.status === 409) {
            storeService.revokeGuardian();
            console.log(
              response.status === 409
                ? "Licence bound to another device — downgraded to free"
                : "Licence expired server-side — downgraded to free",
            );
            // Notify all open windows so the renderer refreshes tier state
            BrowserWindow.getAllWindows().forEach((w) =>
              w.webContents.send("store:state-changed"),
            );
          }
          return;
        }

        const data = (await response.json()) as { licence_key?: string };
        if (data.licence_key && typeof data.licence_key === "string") {
          storeService.refreshLicenceKey(data.licence_key);
          console.log("Licence refreshed successfully");
        }
      } catch {
        console.log("Licence refresh skipped (offline or server unreachable)");
      }
    })();
  }

  ipcMain.handle(
    "seed:encrypt",
    async (_event, seed: unknown, passphrase?: unknown, options?: unknown) => {
      if (typeof seed !== "string" || seed.length === 0 || seed.length > 1024) {
        throw new Error("Invalid seed input.");
      }
      if (
        passphrase !== undefined &&
        (typeof passphrase !== "string" || passphrase.length > 1024)
      ) {
        throw new Error("Invalid passphrase.");
      }

      const normalizedSeed = SeedValidator.normalizeSeed(seed as string);
      if (!SeedValidator.validateSeed(normalizedSeed)) {
        throw new Error("Invalid BIP39 seed phrase.");
      }

      const state = storeService.tryConsumeEncryption();
      if (!state) {
        throw new Error(
          "Encryption quota exhausted. Upgrade to Guardian to continue.",
        );
      }
      const isGuardian = state.tier === "guardian" && state.status === "live";
      const opts =
        options !== null && typeof options === "object"
          ? (options as Record<string, unknown>)
          : {};

      const totalFragments = isGuardian
        ? toSafeInt(opts.totalFragments, 3, 3, 10)
        : 3;
      const threshold = isGuardian
        ? toSafeInt(opts.threshold, 2, 2, totalFragments)
        : 2;
      const guardianAlert = isGuardian ? toGuardianAlert(opts) : undefined;
      storeService.setGuardianAlert(guardianAlert ?? null);

      const fragments = await SeedManager.secureSeed({
        seed: normalizedSeed,
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
      if (
        !Array.isArray(fragments) ||
        fragments.length < 2 ||
        fragments.length > MAX_FRAGMENTS
      ) {
        throw new Error("Invalid fragments input.");
      }
      for (const f of fragments) {
        if (
          typeof f !== "string" ||
          f.length === 0 ||
          f.length > MAX_FRAGMENT_LENGTH
        ) {
          throw new Error("Invalid fragment value.");
        }
      }
      if (
        passphrase !== undefined &&
        (typeof passphrase !== "string" || passphrase.length > 1024)
      ) {
        throw new Error("Invalid passphrase.");
      }
      const seed = await SeedManager.recoverSeed(
        fragments,
        passphrase as string | undefined,
      );

      const state = storeService.getState();
      const alertConfig = storeService.getGuardianAlert();
      if (alertConfig && state.tier === "guardian" && state.status === "live") {
        fetchGeoLocation()
          .then((loc) => sendTelegramAlert(alertConfig, loc))
          .catch(() => console.error("Guardian alert failed (network error)"));
      }

      return seed;
    },
  );

  ipcMain.handle(
    "guardian:test-alert",
    async (_event, botToken: unknown, chatId: unknown) => {
      if (!isValidBotToken(botToken)) {
        throw new Error("Invalid bot token.");
      }
      if (!isValidChatId(chatId)) {
        throw new Error("Invalid chat ID.");
      }
      const state = storeService.getState();
      if (state.tier !== "guardian" || state.status !== "live") {
        throw new Error("Guardian plan required.");
      }
      const location = await fetchGeoLocation();
      const locationStr = formatLocation(location);
      const timestamp = new Date().toUTCString();
      const message = `✅ Kyte Guardian Alert test successful.\n📍 ${locationStr}\n🕐 ${timestamp}\n\n⚠️ This location is approximate and may reflect the ISP's routing center, not the exact device position.\n\nYou will receive alerts like this when your seed is recovered.`;
      await sendTelegramMessage(botToken, chatId, message);
    },
  );

  ipcMain.handle("store:get-state", () => {
    return storeService.getState();
  });

  ipcMain.handle(
    "store:activate-guardian",
    async (_event, licenceKey: unknown) => {
      if (
        typeof licenceKey !== "string" ||
        licenceKey.length === 0 ||
        licenceKey.length > 512
      ) {
        throw new Error("Invalid licence key.");
      }

      // Offline validation first (no regression)
      validateLicenceKey(licenceKey);

      // In dev mode, skip server call
      if (is.dev) {
        return storeService.activateGuardian(licenceKey);
      }

      // Register (licence_key, device_id) with the server
      const deviceId = storeService.getOrCreateDeviceId();
      let response: Response;
      try {
        response = await fetch(LICENCE_VERIFY_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            licence_key: licenceKey,
            device_id: deviceId,
          }),
          signal: AbortSignal.timeout(10000),
        });
      } catch {
        throw new Error("Network connection required to activate.");
      }

      if (response.status === 409) {
        throw new Error(
          "This licence key is already activated on another device.",
        );
      }
      if (response.status === 403) {
        throw new Error("This licence key is no longer valid.");
      }
      if (!response.ok) {
        throw new Error("Activation failed. Please try again later.");
      }

      return storeService.activateGuardian(licenceKey);
    },
  );

  ipcMain.handle("store:revoke-guardian", () => {
    return storeService.revokeGuardian();
  });

  ipcMain.handle("app:open-external", (_event, url: unknown) => {
    if (typeof url !== "string" || !ALLOWED_EXTERNAL_URLS.has(url)) return;
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
