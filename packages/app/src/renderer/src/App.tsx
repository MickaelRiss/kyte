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

const DEFAULT_FRAGMENT_META = [
  { dest: "You keep this" },
  { dest: "Trusted person" },
  { dest: "Cloud backup" },
];

function getFragmentMeta(index: number): {
  label: string;
  tag: string;
  dest: string;
} {
  const label = String.fromCharCode(65 + index); // A, B, C, D, ...
  const preset = DEFAULT_FRAGMENT_META[index];
  return {
    label,
    tag: `Fragment ${label}`,
    dest: preset?.dest ?? `Guardian ${index + 1}`,
  };
}

function App(): React.JSX.Element {
  const [mode, setMode] = useState<"encrypt" | "decrypt" | null>(null);
  const [copiedTag, setCopiedTag] = useState<string | null>(null);
  const [testAlertState, setTestAlertState] = useState<
    "idle" | "sending" | "ok" | "error"
  >("idle");
  const [testAlertError, setTestAlertError] = useState<string | null>(null);

  const { state, refresh } = useStore();
  const isFree = state?.tier !== "guardian";
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

  useEffect(() => {
    if (testAlertState !== "ok" && testAlertState !== "error") return;
    const delay = testAlertState === "ok" ? 3000 : 5000;
    const timeout = setTimeout(() => setTestAlertState("idle"), delay);
    return () => clearTimeout(timeout);
  }, [testAlertState]);

  const reset = (): void => {
    setMode(null);
    setTestAlertState("idle");
    setTestAlertError(null);
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
            style={
              state?.encryption_count === 0
                ? { background: "var(--error)" }
                : undefined
            }
          />
          <span>
            {state?.tier === "guardian" ? "Guardian Plan" : "Free Plan"}
          </span>
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
                      {state?.tier === "guardian"
                        ? "Split your seed into up to 10 fragments"
                        : "Split your seed phrase into 3 fragments"}
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
                      Restore your seed from your fragments
                    </div>
                  </motion.div>
                </motion.div>

                {state?.tier === "free" && (
                  <motion.div className="guardian-banner" variants={fadeIn}>
                    <div className="guardian-banner-hook">
                      Need more encryptions? More fragments? A panic button?
                    </div>
                    <div className="guardian-banner-body">
                      With Guardian, one password reveals your seed. The other
                      shows a decoy and silently alerts your emergency contacts.
                    </div>
                    <button
                      className="guardian-banner-link"
                      onClick={() =>
                        window.store.openExternal(
                          "https://kyte-beryl.vercel.app/",
                        )
                      }
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
                      {`AES-256-GCM encryption with ${encryptHook.threshold}-of-${encryptHook.totalFragments} Shamir secret sharing`}
                    </p>
                  </div>
                </div>

                {!encryptHook.encryptResult && (
                  <motion.div {...fadeIn}>
                    <div className="field">
                      <label className="field-label">Passphrase</label>
                      <input
                        disabled={isFree}
                        value={encryptHook.passphrase}
                        onChange={(e) =>
                          encryptHook.setPassphrase(e.target.value)
                        }
                        placeholder="Enter your passphrase to use encryption AES-256-GCM."
                        type="password"
                      />
                    </div>
                    <div className="field">
                      <label className="field-label">Seed Phrase</label>
                      <textarea
                        value={encryptHook.seed}
                        onChange={(e) => encryptHook.setSeed(e.target.value)}
                        placeholder="Enter your BIP39 mnemonic (12-24 words)..."
                        rows={3}
                      />
                    </div>

                    {state?.tier === "guardian" && (
                      <div className="guardian-split-controls">
                        <div className="field">
                          <label className="field-label">
                            Total fragments
                            <span className="field-hint"> (3–10)</span>
                          </label>
                          <div className="stepper">
                            <button
                              className="stepper-btn"
                              disabled={encryptHook.totalFragments <= 3}
                              onClick={() => {
                                const n = encryptHook.totalFragments - 1;
                                encryptHook.setTotalFragments(n);
                                if (encryptHook.threshold > n) {
                                  encryptHook.setThreshold(n);
                                }
                              }}
                            >
                              −
                            </button>
                            <span className="stepper-value">
                              {encryptHook.totalFragments}
                            </span>
                            <button
                              className="stepper-btn"
                              disabled={encryptHook.totalFragments >= 10}
                              onClick={() =>
                                encryptHook.setTotalFragments(
                                  encryptHook.totalFragments + 1,
                                )
                              }
                            >
                              +
                            </button>
                          </div>
                        </div>
                        <div className="field">
                          <label className="field-label">
                            Minimum to recover
                            <span className="field-hint">
                              {" "}
                              (2–{encryptHook.totalFragments})
                            </span>
                          </label>
                          <div className="stepper">
                            <button
                              className="stepper-btn"
                              disabled={encryptHook.threshold <= 2}
                              onClick={() =>
                                encryptHook.setThreshold(
                                  encryptHook.threshold - 1,
                                )
                              }
                            >
                              −
                            </button>
                            <span className="stepper-value">
                              {encryptHook.threshold}
                            </span>
                            <button
                              className="stepper-btn"
                              disabled={
                                encryptHook.threshold >=
                                encryptHook.totalFragments
                              }
                              onClick={() =>
                                encryptHook.setThreshold(
                                  encryptHook.threshold + 1,
                                )
                              }
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="guardian-alert-controls">
                      <label
                        className={`toggle-label${isFree ? " toggle-disabled" : ""}`}
                      >
                        <span className="toggle-switch">
                          <input
                            type="checkbox"
                            id="checkbox-telegram"
                            disabled={isFree}
                            checked={encryptHook.guardianAlertEnabled}
                            onChange={(e) =>
                              encryptHook.setGuardianAlertEnabled(
                                e.target.checked,
                              )
                            }
                          />
                          <span className="toggle-track" />
                        </span>
                        <span>Enable Telegram notification on recovery</span>
                      </label>
                      {encryptHook.guardianAlertEnabled && (
                        <>
                          <div className="field">
                            <label className="field-label">
                              Bot Token
                              <span
                                className="field-hint"
                                title="The bot token only grants send-only access to one chat. It will be embedded in your fragments."
                              >
                                {" "}
                                ⓘ
                              </span>
                            </label>
                            <input
                              type="password"
                              value={encryptHook.botToken}
                              onChange={(e) =>
                                encryptHook.setBotToken(e.target.value)
                              }
                              placeholder="123456:ABCdef..."
                            />
                          </div>
                          <div className="field">
                            <label className="field-label">Chat ID</label>
                            <input
                              type="text"
                              value={encryptHook.chatId}
                              onChange={(e) =>
                                encryptHook.setChatId(e.target.value)
                              }
                              placeholder="-1001234567890"
                            />
                          </div>
                          <div className="test-alert-row">
                            <button
                              className={`test-alert-button${testAlertState === "sending" ? " test-alert-sending" : ""}${testAlertState === "ok" ? " test-alert-success" : ""}`}
                              disabled={
                                testAlertState === "sending" ||
                                !encryptHook.botToken.trim() ||
                                !encryptHook.chatId.trim()
                              }
                              onClick={async () => {
                                setTestAlertState("sending");
                                setTestAlertError(null);
                                try {
                                  await window.kyte.testGuardianAlert(
                                    encryptHook.botToken.trim(),
                                    encryptHook.chatId.trim(),
                                  );
                                  setTestAlertState("ok");
                                } catch (err) {
                                  setTestAlertError(
                                    err instanceof Error
                                      ? err.message
                                      : "Test failed",
                                  );
                                  setTestAlertState("error");
                                }
                              }}
                            >
                              <span className="test-alert-content">
                                {testAlertState === "sending" && (
                                  <span className="test-alert-spinner" />
                                )}
                                {testAlertState === "ok" && (
                                  <svg className="test-alert-check" viewBox="0 0 16 16" width="14" height="14">
                                    <path d="M3 8.5L6.5 12L13 4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                  </svg>
                                )}
                                <span>
                                  {testAlertState === "sending"
                                    ? "Sending..."
                                    : testAlertState === "ok"
                                      ? "Sent!"
                                      : "Send test notification"}
                                </span>
                              </span>
                            </button>
                            {testAlertState === "error" && (
                              <span className="test-alert-status test-alert-error">
                                {testAlertError}
                              </span>
                            )}
                          </div>
                        </>
                      )}
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
                      Your seed has been encrypted and split into{" "}
                      {encryptHook.encryptResult.length} fragments. Follow the
                      instructions on each card to secure them.
                    </div>
                    <div className="result-label">Generated Fragments</div>
                    <motion.div
                      className="fragment-grid"
                      variants={stagger}
                      initial="initial"
                      animate="animate"
                    >
                      {encryptHook.encryptResult.map(({ data, qr }, index) => {
                        const meta = getFragmentMeta(index);
                        const filename = `kyte-fragment-${meta.label.toLowerCase()}.png`;
                        return (
                          <motion.div
                            className="fragment-card"
                            key={meta.tag}
                            variants={fadeIn}
                          >
                            <div className="fragment-card-header">
                              <span className="fragment-tag">{meta.tag}</span>
                              <div className="fragment-card-actions">
                                <span className="fragment-dest">
                                  {meta.dest}
                                </span>
                                <button
                                  className="copy-button"
                                  onClick={() => downloadDataUrl(qr, filename)}
                                >
                                  <DownloadIcon />
                                  <span>QR</span>
                                </button>
                                <button
                                  className="copy-button"
                                  onClick={() =>
                                    copyToClipboard(data, meta.tag)
                                  }
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
                            <div className="fragment-data">{data}</div>
                          </motion.div>
                        );
                      })}
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
                    <p>
                      {decryptHook.fragmentHint
                        ? `Provide any ${decryptHook.fragmentHint.threshold} of ${decryptHook.fragmentHint.total} fragments`
                        : "Provide your fragments"}
                    </p>
                  </div>
                </div>

                {!decryptHook.decryptResult && (
                  <motion.div {...fadeIn}>
                    <div className="field">
                      <label className="field-label">Fragments</label>
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
                            {decryptHook.fragments.length > 2 && (
                              <button
                                className="remove-fragment-button"
                                onClick={() => decryptHook.removeFragment(i)}
                                aria-label="Remove fragment"
                              >
                                ×
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                      {decryptHook.canAddMore && (
                        <button
                          className="add-fragment-button"
                          onClick={decryptHook.addFragment}
                        >
                          + Add fragment
                        </button>
                      )}
                    </div>

                    <div className="field">
                      <label className="field-label">
                        Passphrase{" "}
                        <span className="field-hint">
                          (leave empty if no passphrase was used)
                        </span>
                      </label>
                      <input
                        type="password"
                        value={decryptHook.passphrase}
                        onChange={(e) =>
                          decryptHook.setPassphrase(e.target.value)
                        }
                        placeholder="Enter passphrase if seed was encrypted with one"
                      />
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
                              copyToClipboard(
                                decryptHook.decryptResult ?? "",
                                "seed",
                              )
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
