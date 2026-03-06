import { app, safeStorage } from "electron";
import fs from "node:fs";
import path from "node:path";
import { StoreState } from "../types/store.js";

export type { StoreState };

// the full internal shape
export interface StoreSchema {
  tier: "free" | "guardian";
  status: null | "live" | "expired";
  encryption_count: number;
  licence_key_encrypted: string | null; // base64(safeStorage.encryptString(key))
}

const MAX_ENCRYPTION_COUNT = 10;

//  Default constant matching StoreSchema for Freemium
const FREE_DEFAULTS: StoreSchema = {
  tier: "free",
  status: null,
  encryption_count: 1,
  licence_key_encrypted: null,
};

export class StoreService {
  private storePath: string;

  constructor() {
    const userDataPath = app.getPath("userData");
    this.storePath = path.join(userDataPath, "kyte-store.json");

    if (!fs.existsSync(this.storePath)) {
      this.write(FREE_DEFAULTS);
    } else {
      try {
        this.read();
      } catch (error) {
        console.error("Store corrupted, resetting to defaults", error);
        this.write(FREE_DEFAULTS);
      }
    }
  }

  // Only place where we touch the hard drive to SAVE
  private write(data: StoreSchema) {
    try {
      const content = JSON.stringify(data, null, 2);
      fs.writeFileSync(this.storePath, content, "utf-8");
    } catch (error) {
      console.error("Could not write to disk", error);
      throw error;
    }
  }

  // Only place where we touch the hard drive to READ
  private read(): StoreSchema {
    const rawData = fs.readFileSync(this.storePath, "utf-8");
    const parsed = JSON.parse(rawData);

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

  getState(): StoreState {
    const data: StoreSchema = this.read();
    return {
      tier: data.tier,
      status: data.status,
      encryption_count: data.encryption_count,
      has_licence_key: data.licence_key_encrypted !== null,
    };
  }

  canEncrypt(): boolean {
    const { encryption_count }: StoreSchema = this.read();
    return encryption_count > 0;
  }

  tryConsumeEncryption(): boolean {
    const data = this.read();
    if (data.encryption_count <= 0) return false;
    data.encryption_count = Math.max(0, data.encryption_count - 1);
    this.write(data);
    return true;
  }

  activateGuardian(licenceKey: string): StoreState {
    if (!safeStorage.isEncryptionAvailable()) {
      throw new Error(
        "OS keychain unavailable. Guardian activation requires secure storage.",
      );
    }

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
      return this.getState();
    } catch (error) {
      throw new Error(
        "Guardian activation failed: " +
          (error instanceof Error ? error.message : String(error)),
      );
    }
  }

  revokeGuardian(): StoreState {
    this.write(FREE_DEFAULTS);
    return this.getState();
  }
}
