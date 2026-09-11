"use client";

import { useState } from "react";
import Modal from "../Modal";
import SiteIcon from "../SiteIcon";
import { WIDGET_REGISTRY } from "@/lib/widgets/registry";
import type { WidgetTypeId } from "@/lib/types";

export default function WidgetStoreModal({
  onPick,
  onClose,
}: {
  onPick: (type: WidgetTypeId) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const results = q
    ? WIDGET_REGISTRY.filter(
        (w) => w.name.toLowerCase().includes(q) || w.description.toLowerCase().includes(q),
      )
    : WIDGET_REGISTRY;

  return (
    <Modal title="Add a widget" onClose={onClose} widthClass="max-w-2xl">
      <input
        autoFocus
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search widgets…"
        className="mb-3 w-full rounded-md border border-border bg-surface-2 px-2.5 py-1.5 text-sm text-foreground outline-none focus:border-accent"
      />
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {results.map((def) => (
          <button
            key={def.type}
            type="button"
            onClick={() => onPick(def.type)}
            className="flex items-start gap-3 rounded-lg border border-border p-3 text-left hover:border-accent/50 hover:bg-surface-2"
          >
            <SiteIcon title={def.name} url="" icon={def.icon} size={32} />
            <span className="min-w-0">
              <span className="block text-sm font-medium text-foreground">{def.name}</span>
              <span className="block text-xs text-muted">{def.description}</span>
            </span>
          </button>
        ))}
        {results.length === 0 && <p className="col-span-full text-sm text-muted">No widgets match &ldquo;{query}&rdquo;.</p>}
      </div>
    </Modal>
  );
}
