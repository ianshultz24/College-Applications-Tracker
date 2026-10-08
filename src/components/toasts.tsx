"use client";

import { toast } from "sonner";

const pill =
  "flex items-center gap-3.5 rounded-[14px] border border-white/14 bg-[rgba(22,20,18,0.86)] py-[7px] pr-[7px] pl-4 text-[14px] text-white shadow-[0_12px_30px_-12px_rgba(0,0,0,0.5)] backdrop-blur-[20px]";

/** "Removed Yale  [Undo]" — Undo runs `onUndo`; `onExpire` runs if it closes without undo. */
export function undoToast(text: string, onUndo: () => void, onExpire?: () => void) {
  let undone = false;
  toast.custom(
    (id) => (
      <div role="status" className={pill}>
        <span className="min-w-0 truncate">{text}</span>
        <button
          type="button"
          className="h-8 shrink-0 rounded-[9px] bg-white/14 px-3 text-[13.5px] font-semibold text-white hover:bg-white/24 focus-visible:outline-2 focus-visible:outline-white"
          onClick={() => {
            undone = true;
            toast.dismiss(id);
            onUndo();
          }}
        >
          Undo
        </button>
      </div>
    ),
    {
      duration: 5000,
      onAutoClose: () => !undone && onExpire?.(),
      onDismiss: () => !undone && onExpire?.(),
    },
  );
}

/** Error toast in the same style ("Couldn't save Yale — check your connection"). */
export function errorToast(text: string) {
  toast.custom(
    () => (
      <div role="alert" className={`${pill} pr-4`}>
        <span aria-hidden className="size-2 shrink-0 rounded-full bg-[#e0685c]" />
        <span>{text}</span>
      </div>
    ),
    { duration: 6000 },
  );
}

export function infoToast(text: string) {
  toast.custom(
    () => (
      <div role="status" className={`${pill} pr-4`}>
        <span>{text}</span>
      </div>
    ),
    { duration: 3000 },
  );
}
