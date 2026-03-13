import { useState, useEffect, useCallback } from "react";

type StoreState = Awaited<ReturnType<typeof window.store.getState>>;

export function useStore() {
  const [state, setStoreState] = useState<StoreState | null>(null);

  const refresh = useCallback(async (): Promise<void> => {
    const freshState = await window.store.getState();
    setStoreState(freshState);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { state, refresh };
}
