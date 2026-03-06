export interface StoreState {
  tier: "free" | "guardian";
  status: null | "live" | "expired";
  encryption_count: number;
  has_licence_key: boolean; // never expose the key itself
}
