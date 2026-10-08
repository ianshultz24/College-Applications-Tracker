import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Preview } from "./preview";

/**
 * Dev-only: the full app on in-memory sample data (no Supabase, nothing saved).
 * http://localhost:3000/collegetracker/dev/preview   (add ?empty=1 for the empty state)
 */
export default function PreviewPage() {
  if (process.env.NODE_ENV !== "development") notFound();
  return (
    <Suspense fallback={<div className="min-h-dvh bg-[#2a2623]" />}>
      <Preview />
    </Suspense>
  );
}
