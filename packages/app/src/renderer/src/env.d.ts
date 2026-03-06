/// <reference types="electron-vite/client" />

declare module '*.css';

declare interface Window {
  store: {
    getState: () => Promise<import("../../types/store").StoreState>;
    activateGuardian: (licenceKey: string) => Promise<import("../../types/store").StoreState>;
    revokeGuardian: () => Promise<import("../../types/store").StoreState>;
  };
}
