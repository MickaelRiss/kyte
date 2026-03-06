import { useState } from "react";
import { extractIpcError } from "../utils/ipc";

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
      const result = await window.kyte.encrypt(seed);
      setEncryptResult(result);
      await refresh();
    } catch (err) {
      setError(extractIpcError(err, "Encryption failed"));
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
