"use client";

import { useCallback, useEffect, useState } from "react";
import { KeyRound, ShieldAlert, ShieldCheck } from "lucide-react";
import { Button } from "@/components/design-system/button";
import { Card, CardContent } from "@/components/design-system/card";
import { apiFetch } from "@/utils/api";

type StepUpVerificationPanelProps = {
  actionKey: string;
  title?: string;
  description?: string;
  onVerifiedChange?: (verified: boolean) => void;
};

type StepUpStatusResponse = {
  verified?: boolean;
  method?: string;
  expiresAt?: string | null;
};

type StepUpChallengeResponse = {
  challengeToken: string;
  expiresAt?: string;
  deliveryHint?: string;
};

export default function StepUpVerificationPanel({
  actionKey,
  title = "Step-up verification",
  description = "Verify a short-lived privileged session before completing this action.",
  onVerifiedChange,
}: StepUpVerificationPanelProps) {
  const [verified, setVerified] = useState(false);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [challengeToken, setChallengeToken] = useState("");
  const [deliveryHint, setDeliveryHint] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const syncStatus = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await apiFetch<StepUpStatusResponse>("/api/auth/step-up/status", {
        authFailureMode: "inline",
        cache: "no-store",
      });
      setVerified(Boolean(response.verified));
      setExpiresAt(response.expiresAt ?? null);
    } catch (err) {
      setVerified(false);
      setExpiresAt(null);
      setError(err instanceof Error ? err.message : "Unable to check step-up status.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void syncStatus();
  }, [syncStatus]);

  useEffect(() => {
    onVerifiedChange?.(verified);
  }, [onVerifiedChange, verified]);

  async function requestChallenge() {
    setRequesting(true);
    setError("");
    setMessage("");
    try {
      const response = await apiFetch<StepUpChallengeResponse>("/api/auth/step-up/challenge", {
        method: "POST",
        body: JSON.stringify({ actionKey }),
      });
      setChallengeToken(response.challengeToken);
      setDeliveryHint(response.deliveryHint ?? "registered authenticator");
      setMessage(`Verification code issued to ${response.deliveryHint ?? "your registered channel"}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to issue a verification code.");
    } finally {
      setRequesting(false);
    }
  }

  async function submitVerification() {
    if (!challengeToken || !code.trim()) {
      setError("Request a verification code and enter the OTP.");
      return;
    }

    setVerifying(true);
    setError("");
    setMessage("");
    try {
      const response = await apiFetch<StepUpStatusResponse>("/api/auth/step-up/verify", {
        method: "POST",
        body: JSON.stringify({ challengeToken, code: code.trim() }),
      });
      setVerified(Boolean(response.verified));
      setExpiresAt(response.expiresAt ?? null);
      setChallengeToken("");
      setCode("");

      setMessage("Step-up verified. You can continue with the privileged action.");
    } catch (err) {
      setVerified(false);
      setError(err instanceof Error ? err.message : "Verification failed.");
    } finally {
      setVerifying(false);
    }
  }

  async function clearVerification() {
    setError("");
    setMessage("");
    try {
      await apiFetch("/api/auth/step-up/status", {
        method: "DELETE",
      });
      setVerified(false);
      setExpiresAt(null);
      setChallengeToken("");
      setCode("");

      setMessage("Step-up session cleared.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to clear step-up session.");
    }
  }

  return (
    <Card className="border-dashed border-slate-300 bg-slate-50/70">
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              {verified ? <ShieldCheck className="h-4 w-4 text-emerald-600" /> : <ShieldAlert className="h-4 w-4 text-amber-600" />}
              {title}
            </div>
            <p className="mt-1 text-xs text-slate-600">{description}</p>
            {expiresAt ? <p className="mt-1 text-xs text-slate-500">Session valid until {new Date(expiresAt).toLocaleString()}.</p> : null}
          </div>
          {verified ? (
            <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">Verified</span>
          ) : (
            <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold text-amber-700">Required</span>
          )}
        </div>

        {error ? <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</div> : null}
        {message ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">{message}</div> : null}

        {!verified ? (
          <>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={() => void requestChallenge()} disabled={loading || requesting}>
                <KeyRound className="h-4 w-4" /> {requesting ? "Sending..." : "Request code"}
              </Button>
            </div>

            {challengeToken ? (
              <div className="space-y-2">
                <label className="block text-xs font-medium text-slate-700">Enter the 6-digit verification code</label>
                <div className="flex flex-col gap-2 md:flex-row">
                  <input
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="123456"
                    value={code}
                    onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                  />
                  <Button type="button" onClick={() => void submitVerification()} disabled={verifying || code.trim().length !== 6}>
                    {verifying ? "Verifying..." : "Verify"}
                  </Button>
                </div>
                <p className="text-xs text-slate-500">Delivery target: {deliveryHint || "registered authenticator"}</p>
              </div>
            ) : null}
          </>
        ) : (
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={() => void clearVerification()}>
              Clear step-up session
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
