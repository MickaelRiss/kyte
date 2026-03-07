import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence, type Easing } from "motion/react";
import logo from "./assets/logo.png";
import { useEncrypt } from "./hooks/useEncrypt";
import { useDecrypt } from "./hooks/useDecrypt";
import { useStore } from "./hooks/useStore";

const ease: Easing = "easeOut";
const COPIED_FEEDBACK_MS = 1500;

const fadeIn = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.25, ease },
};

const stagger = {
  animate: { transition: { staggerChildren: 0.06 } },
};

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
  const [copiedTag, setCopiedTag] = useState<string | null>(null);

  const { state, refresh } = useStore();
  const encryptHook = useEncrypt(refresh);
  const handleDecryptClear = useCallback(() => setMode(null), []);
  const decryptHook = useDecrypt(handleDecryptClear);

  const copyToClipboard = async (text: string, tag: string): Promise<void> => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedTag(tag);
    } catch {
      // Clipboard API unavailable in this context
    }
  };

  useEffect(() => {
    if (!copiedTag) return;
    const timeout = setTimeout(() => setCopiedTag(null), COPIED_FEEDBACK_MS);
    return () => clearTimeout(timeout);
  }, [copiedTag]);

  const reset = (): void => {
    setMode(null);
    encryptHook.reset();
    decryptHook.reset();
  };

  return (
    <div className="app-shell">
      {/* Titlebar */}
      <div className="titlebar">
        <div className="titlebar-brand">
          <div className="titlebar-logo" />
          <span className="titlebar-name">Kyte</span>
        </div>
        <div className="titlebar-status">
          <span
            className="status-dot"
            style={state?.tier === "guardian" ? { background: "var(--accent)" } : undefined}
          />
          <span>{state?.tier === "guardian" ? "Guardian Plan" : "Free Plan"}</span>
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
                  <img src={logo} alt="Kyte" width={30} height={30} />
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

                {state?.tier === "free" && (
                  <motion.div className="guardian-banner" variants={fadeIn}>
                    <div className="guardian-banner-hook">
                      Need more encryptions? More fragments? A panic button?
                    </div>
                    <div className="guardian-banner-body">
                      With Guardian, one password reveals your seed. The other shows a decoy and silently alerts your emergency contacts.
                    </div>
                    <button
                      className="guardian-banner-link"
                      onClick={() => window.store.openExternal("https://kyte-beryl.vercel.app/")}
                    >
                      Discover Guardian →
                    </button>
                  </motion.div>
                )}
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

                {!encryptHook.encryptResult && (
                  <motion.div {...fadeIn}>
                    <div className="field">
                      <label className="field-label">Seed Phrase</label>
                      <textarea
                        value={encryptHook.seed}
                        onChange={(e) => encryptHook.setSeed(e.target.value)}
                        placeholder="Enter your BIP39 mnemonic (12-24 words)..."
                        rows={3}
                      />
                    </div>

                    <button
                      className="submit-button"
                      onClick={encryptHook.handleEncrypt}
                      disabled={encryptHook.loading || !encryptHook.canSubmit}
                    >
                      {encryptHook.loading ? (
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

                {encryptHook.error && (
                  <motion.div className="message message-error" {...fadeIn}>
                    {encryptHook.error}
                  </motion.div>
                )}

                {encryptHook.encryptResult && (
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
                          data: encryptHook.encryptResult.fragmentA.data,
                          qr: encryptHook.encryptResult.fragmentA.qr,
                          filename: "kyte-fragment-a.png",
                        },
                        {
                          meta: FRAGMENT_META[1],
                          data: encryptHook.encryptResult.fragmentB.data,
                          qr: encryptHook.encryptResult.fragmentB.qr,
                          filename: "kyte-fragment-b.png",
                        },
                        {
                          meta: FRAGMENT_META[2],
                          data: encryptHook.encryptResult.fragmentC.data,
                          qr: encryptHook.encryptResult.fragmentC.qr,
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

                {!decryptHook.decryptResult && (
                  <motion.div {...fadeIn}>
                    <div className="field">
                      <label className="field-label">
                        Fragments (any 2 of 3)
                      </label>
                      <div className="fragments-input-group">
                        {decryptHook.fragments.map((frag, i) => (
                          <div className="fragment-input-row" key={i}>
                            <span className="fragment-input-label">
                              {i + 1}
                            </span>
                            <textarea
                              value={frag}
                              onChange={(e) =>
                                decryptHook.updateFragment(i, e.target.value)
                              }
                              placeholder={`Paste fragment ${i + 1}...`}
                              rows={2}
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    <button
                      className="submit-button"
                      onClick={decryptHook.handleDecrypt}
                      disabled={decryptHook.loading || !decryptHook.canSubmit}
                    >
                      {decryptHook.loading ? (
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

                {decryptHook.error && (
                  <motion.div className="message message-error" {...fadeIn}>
                    {decryptHook.error}
                  </motion.div>
                )}

                {decryptHook.decryptResult && (
                  <motion.div className="result-section" {...fadeIn}>
                    <div className="result-label">Recovery Complete</div>
                    <div className="recovered-seed">
                      <div className="recovered-seed-header">
                        <div className="recovered-seed-label">Seed Phrase</div>
                        <div className="recovered-seed-actions">
                          <button
                            className="copy-button"
                            onClick={() =>
                              copyToClipboard(decryptHook.decryptResult ?? "", "seed")
                            }
                          >
                            {copiedTag === "seed" ? (
                              <CheckIcon />
                            ) : (
                              <CopyIcon />
                            )}
                            <span>
                              {copiedTag === "seed" ? "Copied" : "Copy"}
                            </span>
                          </button>
                          <button
                            className="copy-button"
                            onClick={decryptHook.toggleSeedVisible}
                          >
                            <span>
                              {decryptHook.seedVisible ? "Hide" : "Reveal"}
                            </span>
                          </button>
                        </div>
                      </div>
                      <div
                        className={`recovered-seed-value${decryptHook.seedVisible ? "" : " blurred"}`}
                        onClick={() =>
                          !decryptHook.seedVisible &&
                          decryptHook.toggleSeedVisible()
                        }
                      >
                        {decryptHook.decryptResult}
                      </div>
                      <div className="seed-auto-clear-notice">
                        Clears automatically in 30 seconds
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
          Split to protect. Distributed to last. Never lose access again.
        </span>
      </div>
    </div>
  );
}

export default App;
