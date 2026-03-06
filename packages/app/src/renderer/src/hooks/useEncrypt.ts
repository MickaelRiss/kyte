import { useState } from "react";

type EncryptResult = Awaited<ReturnType<typeof window.kyte.encrypt>>;

export function useEncrypt(refresh: () => Promise<void>) {
  const [seed, setSeed] = useState("");
  const [encryptResult, setEncryptResult] = useState<EncryptResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleEncrypt = async (): Promise<void> => {
    setError(null);
    setLoading(true);
    try {
      const allowed = await window.store.canEncrypt();
      if (!allowed) {
        setError("You have used all your available encryptions. Upgrade to Guardian to continue.");
        return;
      }
      const result = await window.kyte.encrypt(seed);
      setEncryptResult(result);
      await window.store.decrement();
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Encryption failed");
    } finally {
      setLoading(false);
    }
  };

  const reset = (): void => {
    setSeed("");
    setEncryptResult(null);
    setError(null);
  };

  const canSubmit = seed.trim() !== "";

  return { seed, setSeed, encryptResult, error, loading, canSubmit, handleEncrypt, reset };
}
