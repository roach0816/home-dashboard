"use client";

import type { ReactNode } from "react";

export default function Tooltip({ label, children }: { label: string; children: ReactNode }) {
  return (
    <span className="group relative inline-flex min-w-0 items-center">
      {children}
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-1.5 -translate-x-1/2 translate-y-1 whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-[11px] font-medium text-background opacity-0 shadow-md transition-all duration-150 ease-out group-hover:translate-y-0 group-hover:opacity-100"
      >
        {label}
      </span>
    </span>
  );
}
