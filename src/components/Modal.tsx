"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import type { ReactNode } from "react";

// Must match the CSS animation-duration for .animate-modal-panel-out in globals.css.
const CLOSE_ANIMATION_MS = 150;

// "Is this running on the client yet" as an external-store subscription —
// document doesn't exist during SSR, and portalling before hydration would
// mismatch the server-rendered tree. There's nothing to actually subscribe
// to (this never changes after the first client render), so the
// subscribe function is a no-op.
function subscribeNoop() {
  return () => {};
}
function useMounted(): boolean {
  return useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false,
  );
}

export default function Modal({
  title,
  onClose,
  children,
  widthClass = "max-w-md",
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  widthClass?: string;
}) {
  const [closing, setClosing] = useState(false);
  // Portal to document.body once mounted (client-only — avoids an SSR
  // mismatch, and document doesn't exist during server rendering anyway).
  const mounted = useMounted();

  function requestClose() {
    if (closing) return;
    setClosing(true);
    setTimeout(onClose, CLOSE_ANIMATION_MS);
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") requestClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [closing]);

  if (!mounted) return null;

  return createPortal(
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 ${
        closing ? "animate-modal-backdrop-out" : "animate-modal-backdrop"
      }`}
      onClick={requestClose}
    >
      <div
        className={`flex max-h-[85vh] w-full ${widthClass} flex-col overflow-hidden rounded-xl border border-border bg-surface-1 shadow-xl ${
          closing ? "animate-modal-panel-out" : "animate-modal-panel"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
          <button
            type="button"
            onClick={requestClose}
            aria-label="Close"
            className="rounded p-1 text-muted hover:bg-surface-3 hover:text-foreground"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="overflow-y-auto p-4">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
