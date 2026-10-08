import type { Metadata } from "next";
import { Background } from "@/components/tracker/Background";
import { SignInForm } from "./sign-in-form";

export const metadata: Metadata = { title: "Sign in · College Tracker" };

export default function SignInPage() {
  return (
    <>
      <Background url={null} blur={12} dim={0.3} />
      <main className="relative z-[1] flex min-h-dvh items-center justify-center p-3 sm:p-6">
        <SignInForm />
      </main>
    </>
  );
}
