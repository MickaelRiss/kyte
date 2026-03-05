import { useState } from "react";

type EncryptResult = Awaited<ReturnType<typeof window.kyte.encrypt>>;

export function useEncrypt() {
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
