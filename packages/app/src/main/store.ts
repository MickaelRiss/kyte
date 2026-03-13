import { app, safeStorage } from "electron";
import { is } from "@electron-toolkit/utils";
import fs from "node:fs";
import path from "node:path";
import { StoreState } from "../types/store.js";
import {
  FREE_ENCRYPTION_QUOTA,
  GUARDIAN_ENCRYPTION_QUOTA,
} from "../constants.js";

export type { StoreState };

export interface GuardianAlertConfig {
  botToken: string;
  chatId: string;
}

// the full internal shape
export interface StoreSchema {
  tier: "free" | "guardian";
  status: null | "live" | "expired";
  encryption_count: number;
  licence_key_encrypted: string | null; // base64(safeStorage.encryptString(key))
  guardian_alert: { bot_token: string; chat_id: string } | null;
}

const FREE_DEFAULTS: StoreSchema = {
  tier: "free",
  status: null,
  encryption_count: FREE_ENCRYPTION_QUOTA,
  licence_key_encrypted: null,
  guardian_alert: null,
};

// In dev mode, start as a Free user with one encryption credit to exercise the quota flow
const DEV_DEFAULTS: StoreSchema = {
  tier: "guardian",
  status: "live",
  encryption_count: GUARDIAN_ENCRYPTION_QUOTA,
  licence_key_encrypted: null,
  guardian_alert: null,
};

const INITIAL_DEFAULTS = is.dev ? DEV_DEFAULTS : FREE_DEFAULTS;

export class StoreService {
  private storePath: string;

  constructor() {
    const userDataPath = app.getPath("userData");
    this.storePath = path.join(userDataPath, "kyte-store.bin");

    try {
      this.read();
    } catch (error) {
      console.error("Store missing or corrupted, resetting to defaults", error);
      this.write(INITIAL_DEFAULTS);
    }
  }

  // Only place where we touch the hard drive to SAVE
  private write(data: StoreSchema) {
    if (!safeStorage.isEncryptionAvailable()) {
      throw new Error("OS secure storage unavailable. Cannot persist store.");
    }
    try {
      const json = JSON.stringify(data);
      const encrypted = safeStorage.encryptString(json);
      fs.writeFileSync(this.storePath, encrypted);
    } catch (error) {
      console.error("Could not write to disk", error);
      throw error;
    }
  }

  // Only place where we touch the hard drive to READ
  private read(): StoreSchema {
    if (!safeStorage.isEncryptionAvailable()) {
      throw new Error("OS secure storage unavailable. Cannot read store.");
    }
    const encrypted = fs.readFileSync(this.storePath);
    const json = safeStorage.decryptString(encrypted);
    const parsed = JSON.parse(json);

    if (
      typeof parsed !== "object" ||
      parsed === null ||
      !["free", "guardian"].includes(parsed.tier) ||
      ![null, "live", "expired"].includes(parsed.status) ||
      typeof parsed.encryption_count !== "number" ||
      !Number.isInteger(parsed.encryption_count) ||
      parsed.encryption_count < 0 ||
      parsed.encryption_count > GUARDIAN_ENCRYPTION_QUOTA ||
      (parsed.licence_key_encrypted !== null &&
        typeof parsed.licence_key_encrypted !== "string")
    ) {
      throw new Error("Store schema validation failed");
    }

    // Migrate legacy stores that lack guardian_alert
    if (parsed.guardian_alert === undefined) {
      parsed.guardian_alert = null;
    }

    // Validate guardian_alert shape and format if present
    if (
      parsed.guardian_alert !== null &&
      (typeof parsed.guardian_alert !== "object" ||
        typeof parsed.guardian_alert.bot_token !== "string" ||
        typeof parsed.guardian_alert.chat_id !== "string" ||
        !/^\d{5,16}:[A-Za-z0-9_-]{35}$/.test(parsed.guardian_alert.bot_token) ||
        !/^-?\d{1,20}$/.test(parsed.guardian_alert.chat_id))
    ) {
      parsed.guardian_alert = null;
    }

    return parsed as StoreSchema;
  }

  private toState(data: StoreSchema): StoreState {
    return {
      tier: data.tier,
      status: data.status,
      encryption_count: data.encryption_count,
      has_licence_key: data.licence_key_encrypted !== null,
    };
  }

  getState(): StoreState {
    return this.toState(this.read());
  }

  // Returns the updated StoreState on success, or null if quota is exhausted
  tryConsumeEncryption(): StoreState | null {
    const data = this.read();
    if (data.encryption_count <= 0) return null;
    data.encryption_count = Math.max(0, data.encryption_count - 1);
    this.write(data);
    return this.toState(data);
  }

  activateGuardian(licenceKey: string): StoreState {
    try {
      const existing = (() => {
        try {
          return this.read();
        } catch {
          return null;
        }
      })();
      const data: StoreSchema = {
        tier: "guardian",
        status: "live",
        encryption_count: GUARDIAN_ENCRYPTION_QUOTA,
        licence_key_encrypted: safeStorage
          .encryptString(licenceKey)
          .toString("base64"),
        guardian_alert: existing?.guardian_alert ?? null,
      };

      this.write(data);
      return this.toState(data);
    } catch (error) {
      throw new Error(
        "Guardian activation failed: " +
          (error instanceof Error ? error.message : String(error)),
      );
    }
  }

  revokeGuardian(): StoreState {
    this.write(FREE_DEFAULTS);
    return this.toState(FREE_DEFAULTS);
  }

  setGuardianAlert(config: GuardianAlertConfig | null): void {
    const data = this.read();
    data.guardian_alert = config
      ? { bot_token: config.botToken, chat_id: config.chatId }
      : null;
    this.write(data);
  }

  getGuardianAlert(): GuardianAlertConfig | null {
    const data = this.read();
    if (!data.guardian_alert) return null;
    return {
      botToken: data.guardian_alert.bot_token,
      chatId: data.guardian_alert.chat_id,
    };
  }
}
