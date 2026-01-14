"use client";

import { useState, useEffect } from "react";

interface TwoFactorStatus {
  enabled: boolean;
  backupCodesRemaining: number;
}

interface SetupData {
  secret: string;
  qrCodeUrl: string;
  backupCodes: string[];
}

type Step = "idle" | "setup" | "verify" | "backup" | "disable";

export function TwoFactorCard() {
  const [status, setStatus] = useState<TwoFactorStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<Step>("idle");
  const [setupData, setSetupData] = useState<SetupData | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [processing, setProcessing] = useState(false);
  const [newBackupCodes, setNewBackupCodes] = useState<string[] | null>(null);

  useEffect(() => {
    fetchStatus();
  }, []);

  async function fetchStatus() {
    try {
      const res = await fetch("/api/auth/two-factor");
      const data = await res.json();
      setStatus(data);
    } catch (error) {
      console.error("Failed to fetch 2FA status:", error);
    } finally {
      setLoading(false);
    }
  }

  async function startSetup() {
    setProcessing(true);
    setError("");

    try {
      const res = await fetch("/api/auth/two-factor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "setup" }),
      });

      const data = await res.json();
      if (data.error) {
        setError(data.error);
        return;
      }

      setSetupData(data);
      setStep("setup");
    } catch (error) {
      setError("Failed to start 2FA setup");
    } finally {
      setProcessing(false);
    }
  }

  async function enableTwoFactor() {
    if (!code || code.length !== 6) {
      setError("Please enter a valid 6-digit code");
      return;
    }

    setProcessing(true);
    setError("");

    try {
      const res = await fetch("/api/auth/two-factor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "enable", code }),
      });

      const data = await res.json();
      if (data.error) {
        setError(data.error);
        return;
      }

      setStep("backup");
    } catch (error) {
      setError("Failed to enable 2FA");
    } finally {
      setProcessing(false);
    }
  }

  async function disableTwoFactor() {
    if (!code || code.length !== 6) {
      setError("Please enter a valid 6-digit code");
      return;
    }

    setProcessing(true);
    setError("");

    try {
      const res = await fetch("/api/auth/two-factor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "disable", code }),
      });

      const data = await res.json();
      if (data.error) {
        setError(data.error);
        return;
      }

      setStatus({ enabled: false, backupCodesRemaining: 0 });
      setStep("idle");
      setCode("");
      setSetupData(null);
    } catch (error) {
      setError("Failed to disable 2FA");
    } finally {
      setProcessing(false);
    }
  }

  async function regenerateBackupCodes() {
    if (!code || code.length !== 6) {
      setError("Please enter a valid 6-digit code");
      return;
    }

    setProcessing(true);
    setError("");

    try {
      const res = await fetch("/api/auth/two-factor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "regenerate-backup-codes", code }),
      });

      const data = await res.json();
      if (data.error) {
        setError(data.error);
        return;
      }

      setNewBackupCodes(data.backupCodes);
      fetchStatus();
    } catch (error) {
      setError("Failed to regenerate backup codes");
    } finally {
      setProcessing(false);
    }
  }

  function finishSetup() {
    setStatus({ enabled: true, backupCodesRemaining: 10 });
    setStep("idle");
    setCode("");
    setSetupData(null);
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
  }

  if (loading) {
    return (
      <div className="p-6 rounded-2xl border border-zinc-800 bg-zinc-900/50">
        <div className="text-center text-zinc-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="p-6 rounded-2xl border border-zinc-800 bg-zinc-900/50">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center">
          <svg className="w-5 h-5 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <div>
          <h3 className="font-semibold">Two-Factor Authentication</h3>
          <p className="text-sm text-zinc-400">
            Add an extra layer of security to your account
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Idle State - Not Enabled */}
      {step === "idle" && !status?.enabled && (
        <div className="space-y-4">
          <div className="p-4 rounded-lg bg-zinc-800/50">
            <p className="text-sm text-zinc-300">
              Two-factor authentication adds an extra layer of security to your account.
              When enabled, you&apos;ll need to enter a code from your authenticator app
              each time you sign in.
            </p>
          </div>
          <button
            onClick={startSetup}
            disabled={processing}
            className="w-full px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white font-medium transition-colors disabled:opacity-50"
          >
            {processing ? "Setting up..." : "Enable Two-Factor Authentication"}
          </button>
        </div>
      )}

      {/* Idle State - Enabled */}
      {step === "idle" && status?.enabled && (
        <div className="space-y-4">
          <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
            <div className="flex items-center gap-2 text-green-400 mb-2">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <span className="font-medium">Two-Factor Authentication is enabled</span>
            </div>
            <p className="text-sm text-zinc-400">
              Backup codes remaining: {status.backupCodesRemaining}
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => {
                setStep("disable");
                setCode("");
                setError("");
              }}
              className="flex-1 px-4 py-2 rounded-lg border border-zinc-700 hover:border-zinc-600 text-zinc-300 font-medium transition-colors"
            >
              Disable 2FA
            </button>
            <button
              onClick={() => {
                setNewBackupCodes(null);
                setCode("");
                setError("");
              }}
              className="flex-1 px-4 py-2 rounded-lg border border-zinc-700 hover:border-zinc-600 text-zinc-300 font-medium transition-colors"
            >
              Regenerate Backup Codes
            </button>
          </div>

          {/* Regenerate backup codes form */}
          {newBackupCodes === null && status?.enabled && (
            <div className="mt-4 p-4 rounded-lg bg-zinc-800/50">
              <p className="text-sm text-zinc-300 mb-3">
                Enter your current 2FA code to regenerate backup codes:
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="6-digit code"
                  className="flex-1 px-4 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500"
                  maxLength={6}
                />
                <button
                  onClick={regenerateBackupCodes}
                  disabled={processing || code.length !== 6}
                  className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white font-medium transition-colors disabled:opacity-50"
                >
                  {processing ? "..." : "Regenerate"}
                </button>
              </div>
            </div>
          )}

          {/* New backup codes display */}
          {newBackupCodes && (
            <div className="mt-4 p-4 rounded-lg bg-zinc-800/50">
              <h4 className="font-medium mb-3">New Backup Codes</h4>
              <p className="text-sm text-zinc-400 mb-3">
                Save these codes in a secure location. You won&apos;t see them again.
              </p>
              <div className="grid grid-cols-2 gap-2">
                {newBackupCodes.map((backupCode, i) => (
                  <code key={i} className="px-3 py-2 rounded bg-zinc-900 text-center font-mono text-sm">
                    {backupCode}
                  </code>
                ))}
              </div>
              <button
                onClick={() => copyToClipboard(newBackupCodes.join("\n"))}
                className="mt-3 w-full px-4 py-2 rounded-lg border border-zinc-700 hover:border-zinc-600 text-zinc-300 font-medium transition-colors"
              >
                Copy All Codes
              </button>
              <button
                onClick={() => setNewBackupCodes(null)}
                className="mt-2 w-full px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white font-medium transition-colors"
              >
                Done
              </button>
            </div>
          )}
        </div>
      )}

      {/* Setup Step */}
      {step === "setup" && setupData && (
        <div className="space-y-4">
          <div className="text-center">
            <p className="text-sm text-zinc-400 mb-4">
              Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
            </p>
            <div className="inline-block p-4 bg-white rounded-lg">
              <img
                src={setupData.qrCodeUrl}
                alt="2FA QR Code"
                className="w-48 h-48"
              />
            </div>
          </div>

          <div className="p-4 rounded-lg bg-zinc-800/50">
            <p className="text-xs text-zinc-500 mb-2">Manual entry key:</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 px-3 py-2 rounded bg-zinc-900 font-mono text-sm text-zinc-300 overflow-x-auto">
                {setupData.secret}
              </code>
              <button
                onClick={() => copyToClipboard(setupData.secret)}
                className="px-3 py-2 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm"
              >
                Copy
              </button>
            </div>
          </div>

          <button
            onClick={() => {
              setStep("verify");
              setCode("");
              setError("");
            }}
            className="w-full px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white font-medium transition-colors"
          >
            Continue to Verify
          </button>
          <button
            onClick={() => {
              setStep("idle");
              setSetupData(null);
            }}
            className="w-full px-4 py-2 rounded-lg border border-zinc-700 hover:border-zinc-600 text-zinc-300 font-medium transition-colors"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Verify Step */}
      {step === "verify" && (
        <div className="space-y-4">
          <p className="text-sm text-zinc-400">
            Enter the 6-digit code from your authenticator app to verify setup:
          </p>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="000000"
            className="w-full px-4 py-3 rounded-lg bg-zinc-800 border border-zinc-700 text-white text-center text-2xl font-mono tracking-widest placeholder-zinc-600 focus:outline-none focus:border-violet-500"
            maxLength={6}
            autoFocus
          />
          <button
            onClick={enableTwoFactor}
            disabled={processing || code.length !== 6}
            className="w-full px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white font-medium transition-colors disabled:opacity-50"
          >
            {processing ? "Verifying..." : "Verify and Enable"}
          </button>
          <button
            onClick={() => setStep("setup")}
            className="w-full px-4 py-2 rounded-lg border border-zinc-700 hover:border-zinc-600 text-zinc-300 font-medium transition-colors"
          >
            Back
          </button>
        </div>
      )}

      {/* Backup Codes Step */}
      {step === "backup" && setupData && (
        <div className="space-y-4">
          <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
            <div className="flex items-center gap-2 text-green-400 mb-2">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="font-medium">Two-Factor Authentication enabled!</span>
            </div>
          </div>

          <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <p className="text-sm text-amber-300 font-medium mb-2">
              Save your backup codes!
            </p>
            <p className="text-xs text-zinc-400 mb-3">
              If you lose access to your authenticator app, you can use these codes to sign in.
              Each code can only be used once. Store them in a secure location.
            </p>
            <div className="grid grid-cols-2 gap-2">
              {setupData.backupCodes.map((backupCode, i) => (
                <code key={i} className="px-3 py-2 rounded bg-zinc-900 text-center font-mono text-sm">
                  {backupCode}
                </code>
              ))}
            </div>
          </div>

          <button
            onClick={() => copyToClipboard(setupData.backupCodes.join("\n"))}
            className="w-full px-4 py-2 rounded-lg border border-zinc-700 hover:border-zinc-600 text-zinc-300 font-medium transition-colors"
          >
            Copy All Backup Codes
          </button>
          <button
            onClick={finishSetup}
            className="w-full px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white font-medium transition-colors"
          >
            I&apos;ve Saved My Backup Codes
          </button>
        </div>
      )}

      {/* Disable Step */}
      {step === "disable" && (
        <div className="space-y-4">
          <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20">
            <p className="text-sm text-red-300 font-medium mb-1">
              Disable Two-Factor Authentication?
            </p>
            <p className="text-xs text-zinc-400">
              This will make your account less secure. You&apos;ll need to set up 2FA again if you want to re-enable it.
            </p>
          </div>
          <p className="text-sm text-zinc-400">
            Enter your current 2FA code to confirm:
          </p>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="000000"
            className="w-full px-4 py-3 rounded-lg bg-zinc-800 border border-zinc-700 text-white text-center text-2xl font-mono tracking-widest placeholder-zinc-600 focus:outline-none focus:border-red-500"
            maxLength={6}
            autoFocus
          />
          <button
            onClick={disableTwoFactor}
            disabled={processing || code.length !== 6}
            className="w-full px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium transition-colors disabled:opacity-50"
          >
            {processing ? "Disabling..." : "Disable 2FA"}
          </button>
          <button
            onClick={() => {
              setStep("idle");
              setCode("");
              setError("");
            }}
            className="w-full px-4 py-2 rounded-lg border border-zinc-700 hover:border-zinc-600 text-zinc-300 font-medium transition-colors"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
