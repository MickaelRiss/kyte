import { useState, useEffect, useMemo } from "react";
import { extractIpcError } from "../utils/ipc";
import { MAX_FRAGMENTS } from "../../../constants";

const SEED_AUTO_CLEAR_MS = 30_000;

function parseFragmentMeta(raw: string): { threshold?: number; total?: number } {
  try {
    const parsed = JSON.parse(raw.trim());
    return {
      threshold: typeof parsed.threshold === "number" ? parsed.threshold : undefined,
      total: typeof parsed.total === "number" ? parsed.total : undefined,
    };
  } catch {
    return {};
  }
}

export function useDecrypt(onClear?: () => void) {
  const [fragments, setFragments] = useState(["", ""]);
  const [passphrase, setPassphrase] = useState("");
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

  // Derive threshold hint from the first parseable non-empty fragment
  const fragmentHint = useMemo((): { threshold: number; total: number } | null => {
    for (const frag of fragments) {
      if (!frag.trim()) continue;
      const meta = parseFragmentMeta(frag);
      if (meta.threshold && meta.total) {
        return { threshold: meta.threshold, total: meta.total };
      }
    }
    return null;
  }, [fragments]);

  const updateFragment = (index: number, value: string): void => {
    setFragments((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const addFragment = (): void => {
    setFragments((prev) => (prev.length < MAX_FRAGMENTS ? [...prev, ""] : prev));
  };

  const removeFragment = (index: number): void => {
    setFragments((prev) => {
      if (prev.length <= 2) return prev;
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleDecrypt = async (): Promise<void> => {
    setError(null);
    setLoading(true);
    const passphraseSnapshot = passphrase.trim() || undefined;
    setPassphrase("");
    try {
      const recovered = await window.kyte.decrypt(
        fragments.filter((f) => f.trim() !== ""),
        passphraseSnapshot,
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
    setPassphrase("");
    setDecryptResult(null);
    setSeedVisible(false);
    setError(null);
  };

  const filledCount = fragments.filter((f) => f.trim() !== "").length;
  const rawThreshold = fragmentHint?.threshold ?? 2;
  const requiredThreshold = Math.max(2, Math.min(rawThreshold, MAX_FRAGMENTS));
  const canSubmit = filledCount >= requiredThreshold;
  const canAddMore = fragments.length < MAX_FRAGMENTS;

  return {
    fragments,
    passphrase,
    setPassphrase,
    updateFragment,
    addFragment,
    removeFragment,
    fragmentHint,
    decryptResult,
    seedVisible,
    toggleSeedVisible,
    error,
    loading,
    canSubmit,
    canAddMore,
    handleDecrypt,
    reset,
  };
}
