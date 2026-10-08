"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";

const field =
  "ct-field w-full h-[54px] rounded-xl border border-line bg-white px-3 pt-[22px] pb-1.5 text-[15px] font-medium text-ink";
const fieldLabel = "pointer-events-none absolute top-2 left-[13px] text-[12px] text-muted";

export function SignInForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setBusy(true);
    setError(null);
    const { error } = await createClient().auth.signInWithPassword({
      email: String(form.get("email") ?? "").trim(),
      password: String(form.get("password") ?? ""),
    });
    if (error) {
      setBusy(false);
      setError(
        error.message === "Invalid login credentials"
          ? "That email and password don’t match. Try again."
          : error.message,
      );
      return;
    }
    router.replace("/");
    router.refresh();
  }

  return (
    <form
      onSubmit={onSubmit}
      className="w-full max-w-[400px] rounded-[24px] bg-white p-[22px_20px_20px] shadow-[0_40px_100px_-30px_rgba(0,0,0,0.6),0_8px_24px_rgba(0,0,0,0.16)] sm:rounded-[28px] sm:p-7"
    >
      <h1 className="m-0 font-serif text-[30px] leading-[1.08] font-medium tracking-[-0.012em]">College Tracker</h1>
      <p className="mt-1.5 mb-0 text-[14px] text-muted">Sign in to see your list.</p>

      <div className="mt-6 flex flex-col gap-2">
        <label className="relative block">
          <span className={fieldLabel}>Email</span>
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            autoFocus
            inputMode="email"
            className={field}
            aria-invalid={!!error}
          />
        </label>
        <label className="relative block">
          <span className={fieldLabel}>Password</span>
          <input
            name="password"
            type="password"
            required
            autoComplete="current-password"
            className={field}
            aria-invalid={!!error}
          />
        </label>
      </div>

      {error && (
        <p role="alert" className="mt-2.5 mb-0 ml-0.5 text-[13px] text-danger">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={busy}
        className="mt-5 h-11 w-full rounded-[13px] bg-ink text-[14.5px] font-semibold text-white hover:bg-[#2b2d34] disabled:opacity-60"
      >
        {busy ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
