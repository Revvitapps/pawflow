"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { loginAction, type LoginState } from "./actions";

export function LoginForm() {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(loginAction, undefined);

  const mfaStep = state?.step === "mfa";
  const codeRef = useRef<HTMLInputElement>(null);

  // Focus the code field the moment we advance to the second step.
  useEffect(() => {
    if (mfaStep) codeRef.current?.focus();
  }, [mfaStep]);

  return (
    <>
      {state?.error ? (
        <p className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {state.error}
        </p>
      ) : null}

      {/* One form across both steps: the email/password inputs stay mounted
          (uncontrolled, so their values persist) and are resubmitted together
          with the code, letting the server verify both factors in one call. */}
      <form action={formAction} className="space-y-4">
        <div className={`space-y-1.5 ${mfaStep ? "hidden" : ""}`}>
          <label htmlFor="email" className="text-sm font-medium text-zinc-700">Email</label>
          <Input id="email" name="email" type="email" autoComplete="email" required readOnly={mfaStep} />
        </div>
        <div className={`space-y-1.5 ${mfaStep ? "hidden" : ""}`}>
          <div className="flex items-center justify-between">
            <label htmlFor="password" className="text-sm font-medium text-zinc-700">Password</label>
            <Link href="/forgot-password" className="text-xs font-medium text-[#2f8f86] underline underline-offset-4">
              Forgot password?
            </Link>
          </div>
          <Input id="password" name="password" type="password" autoComplete="current-password" required readOnly={mfaStep} />
        </div>

        {mfaStep ? (
          <div className="space-y-1.5">
            <label htmlFor="totp" className="text-sm font-medium text-zinc-700">Authentication code</label>
            <Input
              id="totp"
              name="totp"
              ref={codeRef}
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="123456"
              aria-describedby="totp-hint"
            />
            <p id="totp-hint" className="text-xs text-zinc-500">
              Enter the 6-digit code from your authenticator app, or one of your backup codes.
            </p>
          </div>
        ) : null}

        <Button
          type="submit"
          disabled={pending}
          className="w-full rounded-full bg-[#79c6bf] py-6 text-zinc-900 hover:bg-[#68b7af]"
        >
          {pending ? (mfaStep ? "Verifying…" : "Logging in…") : mfaStep ? "Verify" : "Log in"}
        </Button>
      </form>

      {!mfaStep ? (
        <p className="mt-5 text-center text-sm text-zinc-600">
          New to PawFlow?{" "}
          <Link href="/signup" className="font-medium text-[#2f8f86] underline underline-offset-4">
            Create a business
          </Link>
        </p>
      ) : null}
    </>
  );
}
