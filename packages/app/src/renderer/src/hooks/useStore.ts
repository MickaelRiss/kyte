import { useState, useEffect } from "react";

type StoreState = Awaited<ReturnType<typeof window.store.getState>>;

export function useStore() {
  const [state, setStoreState] = useState<StoreState | null>(null);

  const refresh = async (): Promise<void> => {
    const freshState = await window.store.getState();
    setStoreState(freshState);
  };

  useEffect(() => {
    refresh();
  }, []);

  return { state, refresh };
}
