import { app, safeStorage } from "electron";
import { is } from "@electron-toolkit/utils";
import fs from "node:fs";
import path from "node:path";
import { StoreState } from "../types/store.js";
import { FREE_ENCRYPTION_QUOTA } from "../constants.js";

export type { StoreState };

// the full internal shape
export interface StoreSchema {
  tier: "free" | "guardian";
  status: null | "live" | "expired";
  encryption_count: number;
  licence_key_encrypted: string | null; // base64(safeStorage.encryptString(key))
}

const MAX_ENCRYPTION_COUNT = 10;

const FREE_DEFAULTS: StoreSchema = {
  tier: "free",
  status: null,
  encryption_count: FREE_ENCRYPTION_QUOTA,
  licence_key_encrypted: null,
};

// In dev mode, start as Guardian so all features are accessible
const DEV_DEFAULTS: StoreSchema = {
  tier: "guardian",
  status: "live",
  encryption_count: MAX_ENCRYPTION_COUNT,
  licence_key_encrypted: null,
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
      parsed.encryption_count > MAX_ENCRYPTION_COUNT ||
      (parsed.licence_key_encrypted !== null &&
        typeof parsed.licence_key_encrypted !== "string")
    ) {
      throw new Error("Store schema validation failed");
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
      const data: StoreSchema = {
        tier: "guardian",
        status: "live",
        encryption_count: MAX_ENCRYPTION_COUNT,
        licence_key_encrypted: safeStorage
          .encryptString(licenceKey)
          .toString("base64"),
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
}
