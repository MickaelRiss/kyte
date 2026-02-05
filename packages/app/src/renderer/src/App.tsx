import React, { useState, useEffect } from "react";
import { motion, AnimatePresence, type Easing } from "motion/react";

interface EncryptResult {
  fragmentA: { data: string; qr: string };
  fragmentB: { data: string; qr: string };
  fragmentC: { data: string; qr: string };
}

const ease: Easing = "easeOut";

const fadeIn = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.25, ease },
};

const stagger = {
  animate: { transition: { staggerChildren: 0.06 } },
};

function ShieldIcon(): React.JSX.Element {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

function LockIcon(): React.JSX.Element {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function UnlockIcon(): React.JSX.Element {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 9.9-1" />
    </svg>
  );
}

function ArrowLeftIcon(): React.JSX.Element {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M19 12H5" />
      <path d="M12 19l-7-7 7-7" />
    </svg>
  );
}

function CopyIcon(): React.JSX.Element {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function CheckIcon(): React.JSX.Element {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function DownloadIcon(): React.JSX.Element {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function downloadDataUrl(dataUrl: string, filename: string): void {
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

const FRAGMENT_META = [
  {
    tag: "Fragment A",
    dest: "You keep this",
    steps: [
      'Click "Download QR"',
      "Print the QR code",
      "Store it somewhere safe (safe, lockbox...)",
    ],
  },
  {
    tag: "Fragment B",
    dest: "Trusted person",
    steps: [
      'Click "Download QR"',
      "Print the QR code",
      "Give it to someone you trust (family, friend...)",
    ],
  },
  {
    tag: "Fragment C",
    dest: "Cloud backup",
    steps: [
      'Click "Download QR"',
      "Go to your cloud drive (Google Drive, iCloud, AWS...)",
      'Upload "kyte-fragment-c.png"',
    ],
  },
];

function App(): React.JSX.Element {
  const [mode, setMode] = useState<"encrypt" | "decrypt" | null>(null);
  const [seed, setSeed] = useState("");
  const [fragments, setFragments] = useState(["", ""]);
  const [encryptResult, setEncryptResult] = useState<EncryptResult | null>(
    null,
  );
  const [decryptResult, setDecryptResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copiedTag, setCopiedTag] = useState<string | null>(null);
  // const [passphrase, setPassphrase] = useState("");
  // const [confirmPassphrase, setConfirmPassphrase] = useState("");
  // const [showPassphrase, setShowPassphrase] = useState(false);

  const copyToClipboard = async (text: string, tag: string): Promise<void> => {
    await navigator.clipboard.writeText(text);
    setCopiedTag(tag);
  };

  useEffect(() => {
    if (!copiedTag) return;
    const timeout = setTimeout(() => setCopiedTag(null), 1500);
    return () => clearTimeout(timeout);
  }, [copiedTag]);

  const reset = (): void => {
    setMode(null);
    setSeed("");
    // setPassphrase("");
    // setConfirmPassphrase("");
    // setShowPassphrase(false);
    setFragments(["", ""]);
    setEncryptResult(null);
    setDecryptResult(null);
    setError(null);
  };

  const handleEncrypt = async (): Promise<void> => {
    setError(null);
    setLoading(true);
    try {
      const result = await window.kyte.encrypt(seed); // Community: no passphrase
      setEncryptResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Encryption failed");
    } finally {
      setLoading(false);
    }
  };

  const handleDecrypt = async (): Promise<void> => {
    setError(null);
    setLoading(true);
    try {
      const recovered = await window.kyte.decrypt(
        fragments.filter((f) => f.trim() !== ""), // Community: no passphrase
      );
      setDecryptResult(recovered);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Decryption failed");
    } finally {
      setLoading(false);
    }
  };

  const updateFragment = (index: number, value: string): void => {
    setFragments((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  // const canSubmitEncrypt = seed.trim() !== "" && passphrase.trim() !== "" && passphrase === confirmPassphrase;
  // const canSubmitDecrypt = fragments.filter((f) => f.trim() !== "").length >= 2 && passphrase.trim() !== "";
  const canSubmitEncrypt = seed.trim() !== "";
  const canSubmitDecrypt = fragments.filter((f) => f.trim() !== "").length >= 2;

  return (
    <div className="app-shell">
      {/* Titlebar */}
      <div className="titlebar">
        <div className="titlebar-brand">
          <div className="titlebar-logo" />
          <span className="titlebar-name">Kyte</span>
        </div>
        <div className="titlebar-status">
          <span className="status-dot" />
          <span>Secure</span>
        </div>
      </div>

      {/* Content */}
      <div className="app-content">
        <div className="content-container">
          <AnimatePresence mode="wait">
            {/* Landing */}
            {!mode && (
              <motion.div className="landing" key="landing" {...fadeIn}>
                <motion.div
                  className="landing-icon"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                >
                  <ShieldIcon />
                </motion.div>

                <h1>Kyte</h1>
                <p className="landing-subtitle">
                  Seed phrase protection with Shamir secret sharing
                </p>

                <motion.div
                  className="mode-cards"
                  variants={stagger}
                  initial="initial"
                  animate="animate"
                >
                  <motion.div
                    className="mode-card"
                    variants={fadeIn}
                    onClick={() => setMode("encrypt")}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                  >
                    <div className="mode-card-icon">
                      <LockIcon />
                    </div>
                    <div className="mode-card-title">Secure</div>
                    <div className="mode-card-desc">
                      Split your seed phrase into 3 fragments
                    </div>
                  </motion.div>

                  <motion.div
                    className="mode-card"
                    variants={fadeIn}
                    onClick={() => setMode("decrypt")}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                  >
                    <div className="mode-card-icon">
                      <UnlockIcon />
                    </div>
                    <div className="mode-card-title">Recover</div>
                    <div className="mode-card-desc">
                      Restore your seed from any 2 fragments
                    </div>
                  </motion.div>
                </motion.div>
              </motion.div>
            )}

            {/* Encrypt Form */}
            {mode === "encrypt" && (
              <motion.div className="form-panel" key="encrypt" {...fadeIn}>
                <div className="form-header">
                  <button className="back-button" onClick={reset}>
                    <ArrowLeftIcon />
                  </button>
                  <div className="form-header-text">
                    <h2>Secure Seed Phrase</h2>
                    <p>
                      AES-256-GCM encryption with 2-of-3 Shamir secret sharing
                    </p>
                  </div>
                </div>

                {!encryptResult && (
                  <motion.div {...fadeIn}>
                    <div className="field">
                      <label className="field-label">Seed Phrase</label>
                      <textarea
                        value={seed}
                        onChange={(e) => setSeed(e.target.value)}
                        placeholder="Enter your BIP39 mnemonic (12-24 words)..."
                        rows={3}
                      />
                    </div>

                    {/* <div className="field">
                      <label className="field-label">Passphrase</label>
                      <div className="input-with-toggle">
                        <input
                          type={showPassphrase ? "text" : "password"}
                          value={passphrase}
                          onChange={(e) => setPassphrase(e.target.value)}
                          placeholder="Enter a strong passphrase"
                        />
                        <button
                          className="toggle-visibility"
                          onClick={() => setShowPassphrase((v) => !v)}
                          type="button"
                        >
                          {showPassphrase ? <EyeOffIcon /> : <EyeIcon />}
                        </button>
                      </div>
                    </div> */}

                    {/* <div className="field">
                      <label className="field-label">Confirm Passphrase</label>
                      <div className="input-with-toggle">
                        <input
                          type={showPassphrase ? "text" : "password"}
                          value={confirmPassphrase}
                          onChange={(e) => setConfirmPassphrase(e.target.value)}
                          placeholder="Re-enter your passphrase"
                        />
                        <button
                          className="toggle-visibility"
                          onClick={() => setShowPassphrase((v) => !v)}
                          type="button"
                        >
                          {showPassphrase ? <EyeOffIcon /> : <EyeIcon />}
                        </button>
                      </div>
                      {confirmPassphrase.length > 0 &&
                        passphrase !== confirmPassphrase && (
                          <span className="field-hint field-hint-error">
                            Passphrases do not match
                          </span>
                        )}
                    </div> */}

                    <button
                      className="submit-button"
                      onClick={handleEncrypt}
                      disabled={loading || !canSubmitEncrypt}
                    >
                      {loading ? (
                        <span className="spinner" />
                      ) : (
                        <>
                          <LockIcon />
                          <span>Secure & Split</span>
                        </>
                      )}
                    </button>
                  </motion.div>
                )}

                {error && (
                  <motion.div className="message message-error" {...fadeIn}>
                    {error}
                  </motion.div>
                )}

                {encryptResult && (
                  <motion.div className="result-section" {...fadeIn}>
                    <div className="result-banner">
                      Your seed has been encrypted and split into 3 fragments.
                      Follow the instructions on each card to secure them.
                    </div>
                    <div className="result-label">Generated Fragments</div>
                    <motion.div
                      className="fragment-grid"
                      variants={stagger}
                      initial="initial"
                      animate="animate"
                    >
                      {[
                        {
                          meta: FRAGMENT_META[0],
                          data: encryptResult.fragmentA.data,
                          qr: encryptResult.fragmentA.qr,
                          filename: "kyte-fragment-a.png",
                        },
                        {
                          meta: FRAGMENT_META[1],
                          data: encryptResult.fragmentB.data,
                          qr: encryptResult.fragmentB.qr,
                          filename: "kyte-fragment-b.png",
                        },
                        {
                          meta: FRAGMENT_META[2],
                          data: encryptResult.fragmentC.data,
                          qr: encryptResult.fragmentC.qr,
                          filename: "kyte-fragment-c.png",
                        },
                      ].map(({ meta, data, qr, filename }) => (
                        <motion.div
                          className="fragment-card"
                          key={meta.tag}
                          variants={fadeIn}
                        >
                          <div className="fragment-card-header">
                            <span className="fragment-tag">{meta.tag}</span>
                            <div className="fragment-card-actions">
                              <span className="fragment-dest">{meta.dest}</span>
                              <button
                                className="copy-button"
                                onClick={() => downloadDataUrl(qr, filename)}
                              >
                                <DownloadIcon />
                                <span>QR</span>
                              </button>
                              <button
                                className="copy-button"
                                onClick={() => copyToClipboard(data, meta.tag)}
                              >
                                {copiedTag === meta.tag ? (
                                  <CheckIcon />
                                ) : (
                                  <CopyIcon />
                                )}
                                <span>
                                  {copiedTag === meta.tag ? "Copied" : "Copy"}
                                </span>
                              </button>
                            </div>
                          </div>
                          <ol className="fragment-steps">
                            {meta.steps.map((step, i) => (
                              <li key={i}>{step}</li>
                            ))}
                          </ol>
                          <div className="fragment-data">{data}</div>
                        </motion.div>
                      ))}
                    </motion.div>
                  </motion.div>
                )}
              </motion.div>
            )}

            {/* Decrypt Form */}
            {mode === "decrypt" && (
              <motion.div className="form-panel" key="decrypt" {...fadeIn}>
                <div className="form-header">
                  <button className="back-button" onClick={reset}>
                    <ArrowLeftIcon />
                  </button>
                  <div className="form-header-text">
                    <h2>Recover Seed Phrase</h2>
                    <p>Provide any 2 of 3 fragments</p>
                  </div>
                </div>

                {!decryptResult && (
                  <motion.div {...fadeIn}>
                    <div className="field">
                      <label className="field-label">
                        Fragments (any 2 of 3)
                      </label>
                      <div className="fragments-input-group">
                        {fragments.map((frag, i) => (
                          <div className="fragment-input-row" key={i}>
                            <span className="fragment-input-label">
                              {i + 1}
                            </span>
                            <textarea
                              value={frag}
                              onChange={(e) =>
                                updateFragment(i, e.target.value)
                              }
                              placeholder={`Paste fragment ${i + 1}...`}
                              rows={2}
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* <div className="field">
                      <label className="field-label">Passphrase</label>
                      <div className="input-with-toggle">
                        <input
                          type={showPassphrase ? "text" : "password"}
                          value={passphrase}
                          onChange={(e) => setPassphrase(e.target.value)}
                          placeholder="Enter your passphrase"
                        />
                        <button
                          className="toggle-visibility"
                          onClick={() => setShowPassphrase((v) => !v)}
                          type="button"
                        >
                          {showPassphrase ? <EyeOffIcon /> : <EyeIcon />}
                        </button>
                      </div>
                    </div> */}

                    <button
                      className="submit-button"
                      onClick={handleDecrypt}
                      disabled={loading || !canSubmitDecrypt}
                    >
                      {loading ? (
                        <span className="spinner" />
                      ) : (
                        <>
                          <UnlockIcon />
                          <span>Recover Seed</span>
                        </>
                      )}
                    </button>
                  </motion.div>
                )}

                {error && (
                  <motion.div className="message message-error" {...fadeIn}>
                    {error}
                  </motion.div>
                )}

                {decryptResult && (
                  <motion.div className="result-section" {...fadeIn}>
                    <div className="result-label">Recovery Complete</div>
                    <div className="recovered-seed">
                      <div className="recovered-seed-label">Seed Phrase</div>
                      <div className="recovered-seed-value">
                        {decryptResult}
                      </div>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Footer */}
      <div className="app-footer">
        <span className="footer-text">
          AES-256-GCM &middot; Shamir Secret Sharing &middot; 2-of-3 Threshold
        </span>
      </div>
    </div>
  );
}

export default App;
