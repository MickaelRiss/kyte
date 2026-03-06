import { useState, useEffect } from "react";
import { extractIpcError } from "../utils/ipc";

const SEED_AUTO_CLEAR_MS = 30_000;

export function useDecrypt(onClear?: () => void) {
  const [fragments, setFragments] = useState(["", ""]);
  const [decryptResult, setDecryptResult] = useState<string | null>(null);
  const [seedVisible, setSeedVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!decryptResult) return;
    const timeout = setTimeout(() => {
      setDecryptResult(null);
      setSeedVisible(false);
      onClear?.();
    }, SEED_AUTO_CLEAR_MS);
    return () => clearTimeout(timeout);
  }, [decryptResult, onClear]);

  const updateFragment = (index: number, value: string): void => {
    setFragments((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const handleDecrypt = async (): Promise<void> => {
    setError(null);
    setLoading(true);
    try {
      const recovered = await window.kyte.decrypt(
        fragments.filter((f) => f.trim() !== ""),
      );
      setDecryptResult(recovered);
    } catch (err) {
      setError(extractIpcError(err, "Decryption failed"));
    } finally {
      setLoading(false);
    }
  };

  const toggleSeedVisible = (): void => setSeedVisible((v) => !v);

  const reset = (): void => {
    setFragments(["", ""]);
    setDecryptResult(null);
    setSeedVisible(false);
    setError(null);
  };

  const canSubmit = fragments.filter((f) => f.trim() !== "").length >= 2;

  return {
    fragments,
    updateFragment,
    decryptResult,
    seedVisible,
    toggleSeedVisible,
    error,
    loading,
    canSubmit,
    handleDecrypt,
    reset,
  };
}
