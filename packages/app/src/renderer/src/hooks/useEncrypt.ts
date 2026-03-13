import { useState } from "react";
import { extractIpcError } from "../utils/ipc";

type EncryptResult = Awaited<ReturnType<typeof window.kyte.encrypt>>;

export function useEncrypt(refresh: () => Promise<void>) {
  const [seed, setSeed] = useState("");
  const [passphrase, setPassphrase] = useState("");
  const [totalFragments, setTotalFragments] = useState(3);
  const [threshold, setThreshold] = useState(2);
  const [encryptResult, setEncryptResult] = useState<EncryptResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleEncrypt = async (): Promise<void> => {
    setError(null);
    setLoading(true);
    const seedSnapshot = seed;
    const passphraseSnapshot = passphrase.trim() || undefined;
    setSeed("");
    setPassphrase("");
    try {
      const result = await window.kyte.encrypt(seedSnapshot, passphraseSnapshot, { totalFragments, threshold });
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
    setPassphrase("");
    setTotalFragments(3);
    setThreshold(2);
    setEncryptResult(null);
    setError(null);
  };

  const canSubmit = seed.trim() !== "";

  return {
    seed,
    setSeed,
    passphrase,
    setPassphrase,
    totalFragments,
    setTotalFragments,
    threshold,
    setThreshold,
    encryptResult,
    error,
    loading,
    canSubmit,
    handleEncrypt,
    reset,
  };
}
