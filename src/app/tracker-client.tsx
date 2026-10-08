"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createSupabaseBackend } from "@/lib/backend-supabase";
import type { School, Settings } from "@/lib/types";
import { Background } from "@/components/tracker/Background";
import { Tracker } from "@/components/tracker/Tracker";

export function TrackerClient({
  userId,
  email,
  schools,
  settings,
}: {
  userId: string;
  email: string | null;
  schools: School[];
  settings: Settings;
}) {
  const [backend] = useState(() => createSupabaseBackend(userId, email));
  return <Tracker backend={backend} initialSchools={schools} initialSettings={settings} />;
}

export function LoadError({ message }: { message: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <>
      <Background url={null} blur={12} dim={0.35} />
      <main className="relative z-[1] flex min-h-dvh items-center justify-center p-4">
        <div role="alert" className="w-full max-w-[400px] rounded-[24px] bg-white p-7 shadow-[0_40px_100px_-30px_rgba(0,0,0,0.6)]">
          <h1 className="m-0 font-serif text-[25px] font-medium tracking-[-0.01em]">Couldn’t load your schools</h1>
          <p className="mt-2 mb-0 text-[14.5px] leading-[1.5] text-subtle">
            Check your connection and try again. Nothing was lost — your list is saved in your account.
          </p>
          <p className="mt-2 mb-0 text-[12.5px] text-muted">{message}</p>
          <button
            type="button"
            disabled={pending}
            onClick={() => start(() => router.refresh())}
            className="mt-5 h-[42px] rounded-xl bg-ink px-5 text-[14px] font-semibold text-white hover:bg-[#2b2d34] disabled:opacity-60"
          >
            {pending ? "Retrying…" : "Try again"}
          </button>
        </div>
      </main>
    </>
  );
}
